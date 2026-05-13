import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { announcementSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const announcements = await prisma.announcement.findMany({
    include: { creator: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = announcementSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid announcement' }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: session.user?.id ?? '' } });
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  const { title, content } = parsed.data;
  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      createdBy: session.user?.id ?? ''
    }
  });
  const users = await prisma.user.findMany({ select: { id: true } });
  await prisma.notification.createMany({
    data: users.map((member) => ({
      userId: member.id,
      title: 'New announcement',
      message: title
    }))
  });
  return NextResponse.json({ announcement });
}
