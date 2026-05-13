'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Loader2, XCircle, Sparkles, ChevronRight as ArrowRight } from 'lucide-react';

interface LeaveRequest {
  id: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  user?: { name: string | null; email: string };
}

interface CalendarEvent {
  id: string;
  type: 'task' | 'approval' | 'leave';
  title: string;
  status: string;
  date: string;
  endDate?: string;
  hour?: number;
  owner?: string;
  description?: string;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ reason: '', startDate: '', endDate: '' });
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  useEffect(() => { loadCalendar(); }, []);

  const loadCalendar = async () => {
    const [lr, cr] = await Promise.all([fetch('/api/leave-requests'), fetch('/api/calendar')]);
    if (lr.ok) { const d = await lr.json(); setRequests(d.requests || []); }
    if (cr.ok) { const d = await cr.json(); setEvents(d.events || []); }
    setLoading(false);
  };

  const submitLeave = async () => {
    const r = await fetch('/api/leave-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (r.ok) { setForm({ reason: '', startDate: '', endDate: '' }); await loadCalendar(); }
  };

  const decideLeave = async (id: string, action: 'approve' | 'reject') => {
    const r = await fetch('/api/leave-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    if (r.ok) await loadCalendar();
  };

  const monthDays = useMemo(() => buildMonthDays(cursor), [cursor]);
  const selectedEvents = eventsForDay(events, selectedDate);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const pendingLeaves = requests.filter((r) => r.status === 'PENDING').length;
  const approvals = events.filter((e) => e.type === 'approval').length;
  const moveMonth = (d: number) => setCursor((date) => new Date(date.getFullYear(), date.getMonth() + d, 1));

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="relative"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--purple-bright)' }} /><div className="absolute inset-0 animate-ping opacity-20"><Loader2 className="h-8 w-8" style={{ color: 'var(--purple-bright)' }} /></div></div>
      </main>
    );
  }

  return (
    <main className="px-1 py-3 sm:px-4">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="glass-panel p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.7fr] lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] shadow-[0_0_16px_rgba(168,85,247,0.3)]">
                <CalendarPlus size={23} className="text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-2" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                  <Sparkles size={14} /> Calendar
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Full Workflow Calendar</h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Tasks, approvals, leave, and daily activity in one place.</p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
              <input value={form.reason} onChange={(e) => setForm(v => ({ ...v, reason: e.target.value }))} placeholder="Leave reason"
                className="rounded-xl border px-4 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
              <input type="date" value={form.startDate} onChange={(e) => setForm(v => ({ ...v, startDate: e.target.value }))}
                className="rounded-xl border px-4 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
              <input type="date" value={form.endDate} onChange={(e) => setForm(v => ({ ...v, endDate: e.target.value }))}
                className="rounded-xl border px-4 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
              <button onClick={submitLeave} className="glass-button">Submit</button>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
          <div className="glass-panel p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-2" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                  <CalendarDays size={14} /> Month View
                </div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{monthLabel}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => moveMonth(-1)} className="rounded-xl border p-2 transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: 'var(--text-muted)' }} aria-label="Previous month"><ChevronLeft size={18} /></button>
                <button onClick={() => { setCursor(new Date()); setSelectedDate(startOfDay(new Date())); }}
                  className="glass-button-outline px-3 py-2 text-sm">Today</button>
                <button onClick={() => moveMonth(1)} className="rounded-xl border p-2 transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: 'var(--text-muted)' }} aria-label="Next month"><ChevronRight size={18} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
              {weekdays.map((day) => <div key={day}>{day}</div>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const de = eventsForDay(events, day.date);
                const isSel = isSameDay(day.date, selectedDate);
                const isToday = isSameDay(day.date, new Date());
                return (
                  <button key={day.date.toISOString()} onClick={() => setSelectedDate(day.date)}
                    className="min-h-24 rounded-xl border p-2 text-left transition-all duration-200"
                    style={{
                      borderColor: isSel ? 'var(--purple-bright)' : day.inMonth ? 'color-mix(in srgb, var(--glass-border) 60%, transparent)' : 'color-mix(in srgb, var(--glass-border) 20%, transparent)',
                      backgroundColor: isSel ? 'color-mix(in srgb, var(--purple-bright) 10%, transparent)' : day.inMonth ? 'color-mix(in srgb, var(--card-bg) 50%, transparent)' : 'color-mix(in srgb, var(--card-bg) 20%, transparent)',
                      boxShadow: isSel ? '0 0 0 2px rgba(139,92,246,0.14)' : 'none',
                    }}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${isToday ? 'rounded-full px-2 py-0.5 text-white' : ''}`}
                        style={isToday ? { backgroundColor: 'var(--purple-bright)' } : { color: 'var(--text-primary)' }}>{day.date.getDate()}</span>
                      {de.length > 0 && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)', color: 'var(--text-secondary)' }}>{de.length}</span>}
                    </div>
                    <div className="mt-2 space-y-1">
                      {de.slice(0, 3).map((event) => (
                        <div key={`${event.type}-${event.id}`} className="truncate rounded-md px-2 py-1 text-[11px] font-medium"
                          style={{ backgroundColor: event.type === 'leave' ? 'color-mix(in srgb, var(--status-pending) 15%, transparent)' : 'color-mix(in srgb, var(--purple-bright) 12%, transparent)', color: event.type === 'leave' ? 'var(--status-pending)' : 'var(--purple-bright)' }}>
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="space-y-5">
            <section className="glass-panel p-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-2" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                <CalendarDays size={14} /> Selected Day
              </div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              <div className="mt-4 space-y-3">
                {selectedEvents.length === 0 ? (
                  <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: 'var(--text-muted)' }}>No tasks, approvals, or leave scheduled.</div>
                ) : selectedEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{event.owner ?? event.type}</p>
                      </div>
                      <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase"
                        style={{ backgroundColor: event.type === 'leave' ? 'color-mix(in srgb, var(--status-pending) 15%, transparent)' : 'color-mix(in srgb, var(--purple-bright) 12%, transparent)', color: event.type === 'leave' ? 'var(--status-pending)' : 'var(--purple-bright)' }}>{event.status}</span>
                    </div>
                    {typeof event.hour === 'number' && (
                      <p className="mt-3 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><Clock3 size={13} /> Hour slot {event.hour}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-3 gap-3">
              {[
                { label: 'Tasks', value: events.filter((e) => e.type === 'task').length, color: 'var(--purple-bright)' },
                { label: 'Approvals', value: approvals, color: 'var(--status-pending)' },
                { label: 'Leave', value: pendingLeaves, color: 'var(--status-done)' },
              ].map(s => (
                <div key={s.label} className="glass-panel-light p-4 text-center">
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </section>

            <section className="glass-panel p-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-2" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                <CalendarDays size={14} /> Leave Requests
              </div>
              <div className="mt-4 space-y-3">
                {requests.length === 0 ? (
                  <div className="rounded-xl border p-4 text-sm" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: 'var(--text-muted)' }}>No leave requests yet.</div>
                ) : requests.map((item) => (
                  <motion.div key={item.id} className="rounded-xl border p-4 transition-all hover:border-[rgba(168,85,247,0.15)]" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }} whileHover={{ y: -2 }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.reason}</h3>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{formatRange(item)}</p>
                        {item.user && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{item.user.name ?? item.user.email}</p>}
                      </div>
                      <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase"
                        style={{ backgroundColor: item.status === 'APPROVED' ? 'color-mix(in srgb, var(--status-done) 15%, transparent)' : 'color-mix(in srgb, var(--status-pending) 15%, transparent)', color: item.status === 'APPROVED' ? 'var(--status-done)' : 'var(--status-pending)' }}>{item.status}</span>
                    </div>
                    {item.status === 'PENDING' && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => decideLeave(item.id, 'approve')} className="glass-button text-xs flex-1 inline-flex items-center justify-center gap-2 py-2"><CheckCircle2 size={14} /> Approve</button>
                        <button onClick={() => decideLeave(item.id, 'reject')} className="glass-button-outline text-xs flex-1 inline-flex items-center justify-center gap-2 py-2" style={{ borderColor: 'rgba(255,77,157,0.2)', color: '#FF4D9D' }}><XCircle size={14} /> Reject</button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }

function buildMonthDays(cursor: Date) {
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const firstGridDate = new Date(firstOfMonth);
  firstGridDate.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + i);
    return { date: startOfDay(date), inMonth: date.getMonth() === cursor.getMonth() };
  });
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function isWithinDay(date: Date, start: Date, end?: Date) {
  const day = startOfDay(date).getTime();
  const s = startOfDay(start).getTime();
  const e = end ? startOfDay(end).getTime() : s;
  return day >= s && day <= e;
}

function eventsForDay(events: CalendarEvent[], date: Date) {
  return events.filter((e) => isWithinDay(date, new Date(e.date), e.endDate ? new Date(e.endDate) : undefined));
}

function formatRange(request: LeaveRequest) {
  const start = new Date(request.startDate).toLocaleDateString();
  const end = new Date(request.endDate).toLocaleDateString();
  return start === end ? start : `${start} - ${end}`;
}