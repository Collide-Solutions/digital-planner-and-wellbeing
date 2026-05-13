import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: session.user.id,
      createdAt: { gte: today, lt: tomorrow }
    }
  });
  const completedTasks = tasks.filter((task) => ['APPROVED', 'COMPLETED'].includes(task.status)).length;
  const rejectedTasks = tasks.filter((task) => task.status === 'REJECTED').length;
  const pendingApprovals = tasks.filter((task) => task.status === 'WAITING_APPROVAL').length;
  const productivity = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const report = await prisma.dailyReport.upsert({
    where: { id: `${session.user.id}-${today.toISOString().slice(0, 10)}` },
    update: {
      completedTasks,
      pendingTasks: tasks.length - completedTasks,
      summary: `${completedTasks}/${tasks.length} tasks completed with ${pendingApprovals} pending approvals and ${rejectedTasks} rejected tasks.`
    },
    create: {
      id: `${session.user.id}-${today.toISOString().slice(0, 10)}`,
      userId: session.user.id,
      date: today,
      completedTasks,
      pendingTasks: tasks.length - completedTasks,
      summary: `${completedTasks}/${tasks.length} tasks completed with ${pendingApprovals} pending approvals and ${rejectedTasks} rejected tasks.`
    }
  });
  return NextResponse.json({ report, tasks, completedTasks, rejectedTasks, pendingApprovals, productivity });
}
