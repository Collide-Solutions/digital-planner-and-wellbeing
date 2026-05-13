import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';
import { getCurrentHour, isTerminalStatus } from '@/lib/task-engine';

export interface TaskLockValidation {
  isValid: boolean;
  error?: string;
  task?: any;
}

export async function validateTaskAccess(taskId: string, userId: string): Promise<TaskLockValidation> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignedTo: true,
      },
    });

    if (!task) {
      return { isValid: false, error: 'Task not found' };
    }

    if (task.assignedToId !== userId) {
      return { isValid: false, error: 'Unauthorized access to task' };
    }

    // Get all tasks for today to check sequence
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allTasks = await prisma.task.findMany({
      where: {
        assignedToId: userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { currentHour: 'asc' },
    });

    const currentHour = getCurrentHour(task.assignedTo?.shiftStart ?? undefined, task.assignedTo?.shiftEnd ?? undefined);
    const taskIndex = allTasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      return { isValid: false, error: 'Task not found in today\'s schedule' };
    }

    // Check if task is locked and cannot be accessed
    if (task.status === TaskStatus.LOCKED) {
      // Find the previous task
      const previousTask = taskIndex > 0 ? allTasks[taskIndex - 1] : null;

      // Can only access if no previous task exists (first task) or previous task is approved
      if (previousTask && !isTerminalStatus(previousTask.status)) {
        return {
          isValid: false,
          error: 'Previous task must be completed and approved before accessing this task'
        };
      }
    }

    // Check if trying to access future tasks
    if (task.currentHour > currentHour) {
      return {
        isValid: false,
        error: 'Cannot access future tasks. Complete current hour first.'
      };
    }

    return { isValid: true, task };
  } catch (error) {
    console.error('Task access validation error:', error);
    return { isValid: false, error: 'Validation failed' };
  }
}

export async function validateTaskSubmission(taskId: string, userId: string): Promise<TaskLockValidation> {
  try {
    const validation = await validateTaskAccess(taskId, userId);
    if (!validation.isValid) return validation;

    const task = validation.task;

    // Can only submit if task is active
    if (task.status !== TaskStatus.ACTIVE && task.status !== TaskStatus.REJECTED) {
      return {
        isValid: false,
        error: `Task must be active to submit. Current status: ${task.status}`
      };
    }

    return { isValid: true, task };
  } catch (error) {
    console.error('Task submission validation error:', error);
    return { isValid: false, error: 'Validation failed' };
  }
}

export async function validateApprovalRequest(taskId: string, userId: string): Promise<TaskLockValidation> {
  try {
    const validation = await validateTaskSubmission(taskId, userId);
    if (!validation.isValid) return validation;

    const task = validation.task;

    // Must have proof if required
    if (task.requiresProof && !task.proofUrl) {
      return {
        isValid: false,
        error: 'Proof upload required before requesting approval'
      };
    }

    return { isValid: true, task };
  } catch (error) {
    console.error('Approval request validation error:', error);
    return { isValid: false, error: 'Validation failed' };
  }
}

export async function withTaskLocking(
  request: NextRequest,
  handler: (taskId: string, userId: string, task: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const taskId = url.pathname.split('/').pop();

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const validation = await validateTaskAccess(taskId, session.user.id);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 403 });
    }

    return handler(taskId, session.user.id, validation.task);
  } catch (error) {
    console.error('Task locking middleware error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
