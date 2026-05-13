'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.16),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.18),_transparent_20%),linear-gradient(180deg,_#050508_0%,_#120b17_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-glow backdrop-blur-xl p-10 sm:p-16">
        <div className="space-y-6 text-center text-white">
          <p className="text-sm uppercase tracking-[0.3em] text-violet-300/80">Forgot password</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Recover access to your workspace</h1>
          <p className="max-w-2xl mx-auto text-slate-300">Submit your email and we will send a password reset link with secure instructions.</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-10 grid gap-6 rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
          <label className="block text-sm font-medium text-slate-300">
            Email address
            <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="you@company.com" className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-3 text-white outline-none transition focus:border-violet-400/70 focus:ring-2 focus:ring-violet-400/15" />
          </label>
          <button type="submit" className="rounded-3xl bg-violet-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-300">Send reset link</button>
        </form>
        {submitted ? (
          <p className="mt-6 rounded-3xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm text-violet-200">If that email exists in our system, a reset link has been sent.</p>
        ) : null}
        <div className="mt-6 text-center text-sm text-slate-700 dark:text-slate-300">
          <Link href="/auth/login" className="text-white hover:text-violet-200">Return to login</Link>
        </div>
      </div>
    </main>
  );
}

