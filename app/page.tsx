'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Cpu, Rocket } from 'lucide-react';

const stats = [
  { label: 'Hourly workflows', value: '1,482' },
  { label: 'Approval rate', value: '97%' },
  { label: 'Shift coverage', value: '100%' },
  { label: 'Response time', value: '9 min' }
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="glass-panel rounded-[2rem] border border-white/10 p-10 shadow-glow">
            <span className="inline-flex items-center gap-2 rounded-full bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-200 ring-1 ring-violet-400/20">
              <Sparkles size={16} /> New launch: mission-control workflow for modern teams
            </span>
            <div className="mt-8 max-w-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-violet-300/80">Digital Planner</p>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                Focused execution. Structured accountability.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-300 dark:text-slate-200\">\n                A glassmorphism command center for hourly workflows, approval gating, proof of work, and real-time operations.\n              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/login" className="inline-flex items-center justify-center rounded-3xl bg-violet-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-violet-300">
                  Launch workspace
                </Link>
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/80 transition hover:bg-white/10">
                  View dashboard demo
                </Link>
              </div>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[2rem] border border-white/10 p-10 shadow-glow">
            <div className="grid gap-6">
              {stats.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-slate-950/60 p-6">
                  <p className="text-sm text-slate-400 dark:text-slate-300">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </header>

        <section className="grid gap-8 xl:grid-cols-[1fr_0.7fr]">
          <div className="glass-panel rounded-[2rem] border border-white/10 p-10 shadow-glow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-violet-200 uppercase tracking-[0.24em]">Command dashboard</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Mission control for task accountability.</h2>
              </div>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-400/10 text-violet-300">
                <Cpu size={28} />
              </div>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/70 p-6">
                <p className="text-sm text-slate-400 dark:text-slate-300">Current Task</p>
                <p className="mt-3 text-xl font-semibold text-white">Approve sprint review draft and attach proof</p>
                <p className="mt-4 text-sm leading-6 text-slate-300 dark:text-slate-200">The current workflow is locked until the admin approves your uploaded deliverable.</p>
              </div>
              <div className="rounded-3xl bg-slate-950/70 p-6">
                <p className="text-sm text-slate-400 dark:text-slate-300">Team Pulse</p>
                <p className="mt-3 text-xl font-semibold text-white">5 approvals waiting</p>
                <p className="mt-4 text-sm leading-6 text-slate-300 dark:text-slate-200">Real-time notifications keep the operation synced across shifts.</p>
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-[2rem] border border-white/10 p-10 shadow-glow">
            <h3 className="text-xl font-semibold text-white">Why Collide?</h3>
            <div className="mt-6 space-y-4 text-slate-300 dark:text-slate-200">
              <p>Lock future tasks until proof is approved. Keep the team focused one hour at a time.</p>
              <p>Automated daily summaries, approval pipelines, and a sleek mission-control UX built for modern organizations.</p>
            </div>
            <div className="mt-8 grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <p className="text-sm uppercase text-slate-500 dark:text-slate-400">Flow automation</p>
                <p className="mt-3 text-sm text-slate-300 dark:text-slate-200">Admin gates unlock the next hourly step with visually reinforced chronology.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <p className="text-sm uppercase text-slate-500 dark:text-slate-400">Proof of work</p>
                <p className="mt-3 text-sm text-slate-300 dark:text-slate-200">Upload documents, presentations, or screenshots with secure storage and rich previews.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

