import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', events: [] }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const isAdmin = user?.role === 'ADMIN';

  const [tasks, leaveRequests] = await Promise.all([
    prisma.task.findMany({
      where: isAdmin
        ? {}
        : {
            OR: [
              { assignedToId: session.user.id },
              { assignedById: session.user.id }
            ]
          },
      include: {
        assignedTo: { select: { name: true, email: true } },
        assignedBy: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.leaveRequest.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { startDate: 'asc' }
    })
  ]);

  const taskEvents = tasks.map((task) => ({
    id: task.id,
    type: task.status === 'WAITING_APPROVAL' ? 'approval' : 'task',
    title: task.title,
    status: task.status,
    date: task.createdAt,
    hour: task.currentHour,
    owner: task.assignedTo?.name ?? task.assignedTo?.email ?? 'Unassigned',
    description: task.description
  }));

  const leaveEvents = leaveRequests.map((leave) => ({
    id: leave.id,
    type: 'leave',
    title: leave.reason,
    status: leave.status,
    date: leave.startDate,
    endDate: leave.endDate,
    owner: leave.user.name ?? leave.user.email,
    description: leave.reason
  }));

  return NextResponse.json({ events: [...taskEvents, ...leaveEvents] });
}
