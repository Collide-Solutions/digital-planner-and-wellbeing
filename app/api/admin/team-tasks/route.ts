import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized', employees: [] }, { status: 401 });

  const actor = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (actor?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required', employees: [] }, { status: 403 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      shiftStart: true,
      shiftEnd: true,
      tasks: {
        where: { createdAt: { gte: today, lt: tomorrow } },
        include: {
          assignedBy: { select: { name: true, email: true } }
        },
        orderBy: { currentHour: 'asc' }
      }
    },
    orderBy: [{ name: 'asc' }, { email: 'asc' }]
  });

  return NextResponse.json({ employees });
}
