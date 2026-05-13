import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all tasks waiting for approval
    const pendingTasks = await prisma.task.findMany({
      where: {
        status: 'WAITING_APPROVAL',
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'asc', // Oldest first
      },
    });

    return NextResponse.json({ tasks: pendingTasks });
  } catch (error) {
    console.error('Failed to fetch pending approvals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
