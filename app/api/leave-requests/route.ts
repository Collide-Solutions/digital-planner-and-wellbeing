import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leaveRequestSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const requests = await prisma.leaveRequest.findMany({
    where: user?.role === 'ADMIN' ? {} : { userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = leaveRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid leave request' }, { status: 400 });
  const { reason, startDate, endDate } = parsed.data;
  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      userId: session.user?.id as string,
      reason,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'PENDING'
    }
  });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title: 'Leave request submitted',
      message: reason
    }))
  });
  return NextResponse.json({ leaveRequest });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const { id, action, comment } = await request.json();
  if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  const leaveRequest = await prisma.leaveRequest.update({
    where: { id },
    data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED' }
  });
  await prisma.notification.create({
    data: {
      userId: leaveRequest.userId,
      title: action === 'approve' ? 'Leave approved' : 'Leave rejected',
      message: comment || `Your leave request has been ${action === 'approve' ? 'approved' : 'rejected'}.`
    }
  });
  return NextResponse.json({ leaveRequest });
}
