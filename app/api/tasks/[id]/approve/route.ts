import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';
import { approvalActionSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const taskId = request.nextUrl.pathname.split('/').at(-2);
    const parsed = approvalActionSchema.safeParse(await request.json());
    if (!taskId || !parsed.success) return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    const { action, feedback } = parsed.data;

    // Get the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignedTo: true },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'WAITING_APPROVAL') {
      return NextResponse.json({ error: 'Task is not waiting for approval' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? TaskStatus.APPROVED : TaskStatus.ACTIVE;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        adminApproved: action === 'approve',
      },
    });

    // If approved, unlock the next task in sequence
    if (action === 'approve') {
      await unlockNextTask(task.assignedToId!, task.currentHour);
    }

    // Create notification for the user
    await prisma.notification.create({
      data: {
          title: action === 'approve' ? 'Task approved' : 'Task needs revision',
          message: action === 'approve'
            ? `${task.title} has been approved. The next task is unlocked when available.`
            : `${task.title} was returned to active work${feedback ? `: ${feedback}` : '.'}`,
        userId: task.assignedToId!,
      },
    });

    return NextResponse.json({
      success: true,
      task: updatedTask,
      nextTaskUnlocked: action === 'approve'
    });
  } catch (error) {
    console.error('Approval processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function unlockNextTask(userId: string, currentHour: number) {
  try {
    // Get today's tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { currentHour: 'asc' },
    });

    // Find the next task in sequence
    const nextTask = tasks.find(task => task.currentHour === currentHour + 1);

    if (nextTask && nextTask.status === TaskStatus.LOCKED) {
      // Unlock the next task
      await prisma.task.update({
        where: { id: nextTask.id },
        data: { status: TaskStatus.ACTIVE },
      });

      // Create notification for next task unlock
      await prisma.notification.create({
        data: {
          title: 'Next Task Unlocked',
          message: `${nextTask.title} is now available for work`,
          userId,
        },
      });
    }
  } catch (error) {
    console.error('Error unlocking next task:', error);
  }
}
