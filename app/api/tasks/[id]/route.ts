import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const taskId = request.nextUrl.pathname.split('/').at(-1);
  if (!taskId) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

  const taskBefore = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { id: true, name: true, email: true } }
    }
  });
  if (!taskBefore) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const canEdit = actor.role === 'ADMIN' || taskBefore.assignedById === actor.id || taskBefore.assignedToId === actor.id;
  if (!canEdit) return NextResponse.json({ error: 'You do not have permission to edit this task' }, { status: 403 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (typeof body.title === 'string' && body.title.trim().length >= 3) data.title = body.title.trim();
  if (typeof body.description === 'string' && body.description.trim().length >= 3) data.description = body.description.trim();

  if (typeof body.assignedToId === 'string' && body.assignedToId) {
    const target = await prisma.user.findUnique({ where: { id: body.assignedToId } });
    if (!target) return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
    data.assignedToId = body.assignedToId;
  }

  if (body.currentHour !== undefined && body.currentHour !== '') {
    const hour = Number(body.currentHour);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return NextResponse.json({ error: 'Invalid hour slot' }, { status: 400 });
    data.currentHour = hour;
  }

  if (body.estimatedHours !== undefined && body.estimatedHours !== '') {
    const eh = Number(body.estimatedHours);
    if (eh < 0.25 || eh > 24) return NextResponse.json({ error: 'Invalid estimated hours' }, { status: 400 });
    data.estimatedHours = eh;
  }

  if (typeof body.priority === 'string' && body.priority in TaskPriority) data.priority = body.priority as TaskPriority;
  if (typeof body.status === 'string' && body.status in TaskStatus) data.status = body.status as TaskStatus;
  if (typeof body.requiresProof === 'boolean') data.requiresProof = body.requiresProof;
  if (typeof body.deadline === 'string' && body.deadline.trim()) {
    const parsed = new Date(body.deadline);
    if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: 'Invalid deadline value' }, { status: 400 });
    data.deadline = parsed;
  }

  // Checklist fields
  if (typeof body.checklistReviewed === 'boolean') data.checklistReviewed = body.checklistReviewed;
  if (typeof body.checklistRequirementsRecieved === 'boolean') data.checklistRequirementsRecieved = body.checklistRequirementsRecieved;
  if (typeof body.checklistStarted === 'boolean') data.checklistStarted = body.checklistStarted;
  if (typeof body.checklistCompleted === 'boolean') data.checklistCompleted = body.checklistCompleted;

  const changes = Object.entries(data)
    .map(([field, newValue]) => {
      const oldValue = (taskBefore as Record<string, unknown>)[field];
      if (String(oldValue ?? '') === String(newValue ?? '')) return null;
      return { field, oldValue: oldValue == null ? null : String(oldValue), newValue: newValue == null ? null : String(newValue) };
    })
    .filter(Boolean) as Array<{ field: string; oldValue: string | null; newValue: string | null }>;

  if (changes.length === 0) return NextResponse.json({ task: taskBefore, changes: [] });

  const task = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: data as any,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true, email: true } },
        activityLogs: { include: { changedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 12 }
      }
    });

    await tx.taskActivityLog.createMany({
      data: changes.map((change) => ({
        taskId,
        changedById: actor.id,
        fieldChanged: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue
      }))
    });

    const recipientIds = new Set<string>();
    const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    admins.forEach((admin) => recipientIds.add(admin.id));
    if (taskBefore.assignedById) recipientIds.add(taskBefore.assignedById);
    if (taskBefore.assignedToId) recipientIds.add(taskBefore.assignedToId);
    if (updated.assignedToId) recipientIds.add(updated.assignedToId);
    recipientIds.delete(actor.id);

    // Check if checklist "Completed" step was just ticked -> auto-set status to COMPLETED
    const checklistCompletedJustTicked = data.checklistCompleted === true && !taskBefore.checklistCompleted;
    if (checklistCompletedJustTicked && updated.status !== 'COMPLETED') {
      await tx.task.update({
        where: { id: taskId },
        data: { status: 'COMPLETED' }
      });
      updated.status = 'COMPLETED';
    }

    const changeSummary = changes.map((change) => `${change.field} from ${change.oldValue ?? 'empty'} to ${change.newValue ?? 'empty'}`).join(', ');
    if (recipientIds.size > 0) {
      const notifications: Array<{ userId: string; title: string; message: string; type: string; entityId: string; entityType: string }> = [];
      
      // If checklist "Completed" just got ticked, send completion notification
      if (checklistCompletedJustTicked) {
        Array.from(recipientIds).forEach((userId) => {
          notifications.push({
            userId,
            title: 'Task completed',
            message: `${actor.name ?? actor.email} completed the task "${updated.title}" via checklist. Status set to COMPLETED.`,
            type: 'task_completed',
            entityId: taskId,
            entityType: 'task'
          });
        });
      } else {
        Array.from(recipientIds).forEach((userId) => {
          notifications.push({
            userId,
            title: 'Task updated',
            message: `${actor.name ?? actor.email} updated ${changeSummary}`,
            type: 'task_edited',
            entityId: taskId,
            entityType: 'task'
          });
        });
      }

      // If status changed, also notify admin specifically
      if (data.status && data.status !== taskBefore.status) {
        Array.from(recipientIds).forEach((userId) => {
          notifications.push({
            userId,
            title: 'Task status changed',
            message: `${actor.name ?? actor.email} changed status of "${updated.title}" to ${data.status}`,
            type: 'task_status',
            entityId: taskId,
            entityType: 'task'
          });
        });
      }

      if (notifications.length > 0) {
        await tx.notification.createMany({ data: notifications });
      }
    }

    return updated;
  });

  return NextResponse.json({ task, changes });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const taskId = request.nextUrl.pathname.split('/').at(-1);
  if (!taskId) return NextResponse.json({ error: 'Task ID required' }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const canDelete = actor.role === 'ADMIN' || task.assignedById === actor.id || task.assignedToId === actor.id;
  if (!canDelete) return NextResponse.json({ error: 'You do not have permission to delete this task' }, { status: 403 });

  await prisma.task.delete({ where: { id: taskId } });

  return NextResponse.json({ success: true });
}
