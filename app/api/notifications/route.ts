import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const notifications = await prisma.notification.findMany({ where: { userId: session.user?.id as string }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, all } = await request.json();
  if (all) {
    await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } });
    return NextResponse.json({ success: true });
  }
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
  const result = await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { read: true } });
  return NextResponse.json({ success: result.count > 0 });
}
