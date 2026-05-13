import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT || 587),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD
  }
});

export async function sendResetEmail(email: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?email=${encodeURIComponent(email)}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset your Digital Planner password',
    html: `<div style="background:#050a13;color:#f8fafc;padding:24px;border-radius:20px;font-family:Inter,system-ui,sans-serif;">
      <h1 style="color:#7dd3fc;">Reset your password</h1>
      <p style="color:#cbd5e1;">Click the button below to continue to Digital Planner.</p>
      <a href="${resetUrl}" style="display:inline-block;margin-top:24px;padding:14px 24px;background:#22d3ee;color:#020617;border-radius:14px;text-decoration:none;">Reset password</a>
      <p style="margin-top:24px;color:#94a3b8;">If you did not request this, you can ignore this email.</p>
    </div>`
  });
}
