'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    await signIn('credentials', { email, password, redirect: true, callbackUrl: '/dashboard' });
    setLoading(false);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(167,139,250,0.14),_transparent_32%),linear-gradient(135deg,_#ffffff_0%,_#f2e9ff_48%,_#fbf7ff_100%)] px-4 py-10 text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.18),_transparent_20%),linear-gradient(180deg,_#050508_0%,_#120b17_100%)] dark:text-white">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-white/60 bg-white/55 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:shadow-glow"
      >
        <div className="mb-8 space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-violet-700 dark:text-violet-300/80">Sign in</p>
          <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Access your command center</h1>
          <p className="text-sm text-slate-700 dark:text-slate-300">Continue to Collide Digital Planner.</p>
        </div>

        <label className="mb-4 block text-sm font-semibold text-slate-800 dark:text-slate-300">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            placeholder="you@company.com"
            className="mt-2 w-full rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-slate-900/80 dark:text-white dark:focus:border-violet-400/70 dark:focus:ring-violet-400/15"
          />
        </label>

        <label className="mb-6 block text-sm font-semibold text-slate-800 dark:text-slate-300">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            placeholder="••••••••"
            className="mt-2 w-full rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-slate-900/80 dark:text-white dark:focus:border-violet-400/70 dark:focus:ring-violet-400/15"
          />
        </label>

        <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-400 dark:text-slate-950 dark:hover:bg-violet-300">
          {loading ? 'Signing in...' : 'Continue'}
          <ArrowRight size={18} />
        </button>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-700 dark:text-slate-400">
          <Link href="/auth/forgot-password" className="transition hover:text-slate-950 dark:hover:text-white">Forgot password?</Link>
          <Link href="/auth/register" className="transition hover:text-slate-950 dark:hover:text-white">Create account</Link>
        </div>
      </motion.form>
    </main>
  );
}
