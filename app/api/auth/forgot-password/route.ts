import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendResetEmail } from '@/services/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await sendResetEmail(email);
  }
  return NextResponse.json({ success: true });
}