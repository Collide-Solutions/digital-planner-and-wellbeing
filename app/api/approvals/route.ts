import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const { taskId, action, comment } = await request.json();
  if (!taskId || !action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: action === 'approve' ? 'APPROVED' : 'ACTIVE',
      adminApproved: action === 'approve',
      updatedAt: new Date()
    }
  });
  await prisma.notification.create({
    data: {
      userId: task.assignedToId ?? '',
      title: action === 'approve' ? 'Task approved' : 'Task rejected',
      message: comment ? `${comment}` : `Task ${action} by admin.`
    }
  });
  return NextResponse.json({ task });
}
