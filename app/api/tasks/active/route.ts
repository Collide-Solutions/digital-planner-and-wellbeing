import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized', tasks: [] }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { status: 'ACTIVE' },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, department: true, shiftStart: true, shiftEnd: true } }
    },
    orderBy: [{ assignedToId: 'asc' }, { currentHour: 'asc' }]
  });

  const now = new Date();
  const result = tasks.map((task) => {
    const shiftStart = task.assignedTo?.shiftStart ?? '09:00';
    const [startHour] = shiftStart.split(':').map(Number);
    const due = new Date(now);
    due.setHours(startHour + task.currentHour + 1, 0, 0, 0);
    const minutesRemaining = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 60000));

    return {
      id: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
      currentHour: task.currentHour,
      dueTime: due.toISOString(),
      minutesRemaining,
      assignedTo: task.assignedTo
    };
  });

  return NextResponse.json({ tasks: result });
}
