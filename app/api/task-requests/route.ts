import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { taskRequestActionSchema } from '@/lib/validators';
import { TaskStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized', requests: [] }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const requests = await prisma.taskRequest.findMany({
      where: user?.role === 'ADMIN' ? {} : { receiverId: session.user.id, status: 'PENDING' },
      include: {
        sender: {
          select: { name: true, email: true }
        },
        receiver: {
          select: { name: true, email: true }
        },
        comments: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ requests: requests || [] });
  } catch (error) {
    console.error('Failed to fetch requests:', error);
    return NextResponse.json({ error: 'Failed to fetch requests', requests: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = taskRequestActionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request action' }, { status: 400 });
    const { requestId, action } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const actor = await tx.user.findUnique({ where: { id: session.user.id } });
      if (!actor) throw new Error('UNAUTHORIZED');

      const taskRequest = await tx.taskRequest.findUnique({
        where: { id: requestId },
        include: { sender: true, receiver: true }
      });

      if (!taskRequest) throw new Error('REQUEST_NOT_FOUND');
      if (taskRequest.receiverId !== session.user.id && actor.role !== 'ADMIN') throw new Error('UNAUTHORIZED');
      if (taskRequest.status !== 'PENDING') throw new Error('ALREADY_PROCESSED');

      const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED';

      const updatedRequest = await tx.taskRequest.update({
        where: { id: requestId },
        data: { status: newStatus }
      });

      let task = null;
      if (action === 'accept') {
        const existingTasks = await tx.task.findMany({
          where: { assignedToId: taskRequest.receiverId },
          orderBy: { currentHour: 'asc' }
        });
        const nextHour = existingTasks.reduce((max, item) => Math.max(max, item.currentHour + 1), 0);
        const canStart = !existingTasks.some((item) => ['ACTIVE', 'WAITING_APPROVAL', 'LOCKED', 'REJECTED'].includes(item.status));

        task = await tx.task.create({
          data: {
            title: taskRequest.title,
            description: taskRequest.description,
            priority: taskRequest.priority,
            status: canStart ? TaskStatus.ACTIVE : TaskStatus.LOCKED,
            requiresProof: true,
            currentHour: nextHour,
            assignedById: taskRequest.senderId,
            assignedToId: taskRequest.receiverId
          }
        });
      }

      await tx.notification.create({
        data: {
          userId: taskRequest.senderId,
          title: action === 'accept' ? 'Task request accepted' : 'Task request declined',
          message: `${actor.role === 'ADMIN' ? actor.name ?? actor.email : taskRequest.receiver.name ?? taskRequest.receiver.email} ${action === 'accept' ? 'accepted' : 'declined'} "${taskRequest.title}".`
        }
      });

      return { request: updatedRequest, task };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'REQUEST_NOT_FOUND') return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      if (error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      if (error.message === 'ALREADY_PROCESSED') return NextResponse.json({ error: 'Request already processed' }, { status: 409 });
    }
    console.error('Failed to process task request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
