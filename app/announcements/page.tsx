'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Plus, Sparkles } from 'lucide-react';

interface Announcement { id: string; title: string; content: string; createdAt: string; creator?: { name: string | null; email: string }; }

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState({ title: '', content: '' });

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    const r = await fetch('/api/announcements');
    if (r.ok) { const d = await r.json(); setAnnouncements(d.announcements || []); }
  };

  const createAnnouncement = async () => {
    const r = await fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (r.ok) { setForm({ title: '', content: '' }); await loadAnnouncements(); }
  };

  return (
    <main className="min-h-screen px-1 py-4 sm:px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="glass-panel p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] shadow-[0_0_16px_rgba(168,85,247,0.3)]">
                <Megaphone size={22} className="text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-2" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                  <Sparkles size={14} /> Announcements
                </div>
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Team Notices</h1>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} placeholder="Title"
                className="rounded-xl border px-4 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
              <input value={form.content} onChange={e => setForm(v => ({ ...v, content: e.target.value }))} placeholder="Message"
                className="rounded-xl border px-4 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
              <button onClick={createAnnouncement} className="glass-button inline-flex items-center justify-center gap-2"><Plus size={16} /> Publish</button>
            </div>
          </div>
        </section>

        {announcements.length === 0 ? (
          <section className="glass-panel p-12 text-center">
            <Megaphone className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>No announcements</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Published notices will appear here instantly.</p>
          </section>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {announcements.map((item) => (
              <motion.article key={item.id} className="glass-panel-light p-5" whileHover={{ y: -3 }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{item.title}</h2>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.content}</p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: 'var(--text-muted)' }}>
                    {item.creator?.name ?? 'Admin'}
                  </span>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}