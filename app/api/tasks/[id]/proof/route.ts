import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateTaskSubmission } from '@/lib/task-locking';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const taskId = (formData.get('taskId') as string) || request.nextUrl.pathname.split('/').at(-2);
    const file = formData.get('proof') as File;

    if (!taskId || !file) {
      return NextResponse.json({ error: 'Task ID and proof file required' }, { status: 400 });
    }

    // Validate task access and submission permissions
    const validation = await validateTaskSubmission(taskId, session.user.id);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 403 });
    }

    const task = validation.task;

    // Check file type and size
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Allowed: images, PDF, DOC, DOCX, or ZIP'
      }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Maximum size: 10MB'
      }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'proofs');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${randomUUID()}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const proofUrl = `/uploads/proofs/${fileName}`;
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        proofUrl,
        status: 'WAITING_APPROVAL',
      },
    });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        title: 'Task submitted for approval',
        message: `${task.title} has been submitted for approval.`,
        userId: admin.id,
      })),
    });

    return NextResponse.json({
      success: true,
      task: updatedTask,
      proofUrl
    });
  } catch (error) {
    console.error('Proof upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
