'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    await signIn('credentials', { email, password, redirect: true, callbackUrl: '/dashboard' });
    setLoading(false);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(167,139,250,0.14),_transparent_32%),linear-gradient(135deg,_#ffffff_0%,_#f2e9ff_48%,_#fbf7ff_100%)] px-4 py-10 text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.18),_transparent_20%),linear-gradient(180deg,_#050508_0%,_#120b17_100%)] dark:text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-white/60 bg-white/55 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:shadow-glow">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-violet-700 dark:text-violet-300/80">Register</p>
          <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Create account</h1>
          <p className="text-sm text-slate-700 dark:text-slate-300">Join Digital Planner.</p>
        </div>
        <label className="mb-4 block text-sm font-semibold text-slate-800 dark:text-slate-300">
          Full name
          <input value={name} onChange={(event) => setName(event.target.value)} required type="text" placeholder="Avery Clarke" className="mt-2 w-full rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-slate-900/80 dark:text-white" />
        </label>
        <label className="mb-4 block text-sm font-semibold text-slate-800 dark:text-slate-300">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="you@company.com" className="mt-2 w-full rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-slate-900/80 dark:text-white" />
        </label>
        <label className="mb-6 block text-sm font-semibold text-slate-800 dark:text-slate-300">
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} required type="password" placeholder="••••••••" className="mt-2 w-full rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-slate-900/80 dark:text-white" />
        </label>
        <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-400 dark:text-slate-950">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <div className="mt-6 text-center text-sm text-slate-700 dark:text-slate-400">
          Already have an account? <Link href="/auth/login" className="font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-200">Sign in</Link>
        </div>
      </form>
    </main>
  );
}

