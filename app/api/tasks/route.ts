import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { taskSchema } from '@/lib/validators';
import { TaskStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', tasks: [] }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - 7);
    const rangeEnd = new Date(today);
    rangeEnd.setMonth(rangeEnd.getMonth() + 1);
    rangeEnd.setDate(rangeEnd.getDate() + 7);

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: session.user.id,
        OR: [
          { deadline: { gte: rangeStart, lte: rangeEnd } },
          { status: { in: [TaskStatus.LOCKED, TaskStatus.ACTIVE, TaskStatus.WAITING_APPROVAL, TaskStatus.REJECTED] } }
        ]
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, department: true }
        },
        assignedBy: {
          select: { name: true, email: true }
        },
        activityLogs: {
          include: { changedBy: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: {
        currentHour: 'asc',
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { shiftStart: true, shiftEnd: true, role: true }
    });

    return NextResponse.json({
      tasks: tasks || [],
      shift: {
        start: user?.shiftStart ?? '09:00',
        end: user?.shiftEnd ?? '18:00'
      },
      role: user?.role
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Internal server error', tasks: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const normalizedBody = {
      ...body,
      estimatedHours: body.estimatedHours === '' ? undefined : body.estimatedHours,
      date: typeof body.date === 'string' && body.date.trim() ? body.date.trim() : undefined,
    };

    const parsed = taskSchema.safeParse(normalizedBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json({
        error: firstIssue?.message ?? 'Invalid task payload',
        fields: parsed.error.flatten().fieldErrors
      }, { status: 400 });
    }

    const { title, description, priority = 'MEDIUM', estimatedHours, requiresProof = true, assignedToId, date } = parsed.data;
    const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const targetUserId = assignedToId || session.user.id;
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });

    let deadline: Date | undefined;
    if (date) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      deadline = parsedDate;
    }

    if (actor.role !== 'ADMIN' && targetUserId !== session.user.id) {
      const request = await prisma.taskRequest.create({
        data: {
          title,
          description,
          priority,
          senderId: session.user.id,
          receiverId: targetUserId
        }
      });
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'New peer task request',
          message: `${actor.name ?? actor.email} requested: "${title}".`
        }
      });
      return NextResponse.json({ request, queuedForAcceptance: true }, { status: 202 });
    }

    const siblingTasks = await prisma.task.findMany({
      where: { assignedToId: targetUserId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: { currentHour: 'asc' }
    });
    const nextHour = siblingTasks.reduce((max, item) => Math.max(max, item.currentHour + 1), 0);
    const hasBlockingTask = siblingTasks.some((item) => ['ACTIVE', 'WAITING_APPROVAL', 'LOCKED', 'REJECTED'].includes(item.status));

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        currentHour: nextHour,
        estimatedHours: estimatedHours ?? 1,
        requiresProof,
        deadline: deadline ?? undefined,
        status: hasBlockingTask ? TaskStatus.LOCKED : TaskStatus.ACTIVE,
        assignedById: session.user.id,
        assignedToId: targetUserId,
      },
    });

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: actor.role === 'ADMIN' ? 'Task assigned' : 'Task created',
        message: actor.role === 'ADMIN'
          ? `${actor.name ?? actor.email} assigned "${title}" to your planner.`
          : `"${title}" is now in your planner.`
      }
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
