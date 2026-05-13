'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Send, XCircle, Sparkles, UserRound, Clock, ChevronRight, Activity } from 'lucide-react';

interface TaskRequest { id: string; title: string; description: string; status: string; createdAt: string; sender: { name: string | null; email: string }; receiver: { name: string | null; email: string }; }
interface ActiveTask { id: string; title: string; priority: string; minutesRemaining: number; assignedTo?: { name: string | null; email: string; department: string | null }; }
interface LeaveRequest { id: string; reason: string; status: string; user?: { name: string | null; email: string }; }
interface ProofApproval { id: string; title: string; assignedTo?: { name: string | null; email: string }; }

export default function RequestsPage() {
  const [requests, setRequests] = useState<TaskRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [role, setRole] = useState<string>();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [approvals, setApprovals] = useState<ProofApproval[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      const r = await fetch('/api/task-requests');
      const d = await r.json();
      setRequests(d.requests || []);
      const [ar, tr, lr, apr] = await Promise.all([
        fetch('/api/tasks/active'), fetch('/api/tasks'),
        fetch('/api/leave-requests'), fetch('/api/admin/pending-approvals')
      ]);
      if (ar.ok) { const ad = await ar.json(); setActiveTasks(ad.tasks || []); }
      if (tr.ok) { const td = await tr.json(); setRole(td.role); }
      if (lr.ok) { const ld = await lr.json(); setLeaves(ld.requests || []); }
      if (apr.ok) { const apd = await apr.json(); setApprovals(apd.tasks || []); }
    } finally { setLoading(false); }
  };

  const fr = requests.filter(r => statusFilter === 'ALL' || r.status === statusFilter);

  const handleRequestAction = async (requestId: string, action: 'accept' | 'decline') => {
    setProcessing(requestId); setMessage(null);
    const prev = requests;
    setRequests(i => i.filter(r => r.id !== requestId));
    try {
      const r = await fetch('/api/task-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, action }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to process request');
      setMessage(action === 'accept' ? 'Task accepted and added to your planner.' : 'Request declined and sender notified.');
    } catch (e) { setRequests(prev); setMessage(e instanceof Error ? e.message : 'Action failed. Please try again.'); }
    finally { setProcessing(null); }
  };

  return (
    <main className="min-h-screen px-1 py-4 sm:px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="glass-panel p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] shadow-[0_0_16px_rgba(168,85,247,0.3)]">
                <Send size={22} className="text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-2" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                  <Sparkles size={14} /> Task Requests
                </div>
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Incoming Peer Requests</h1>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{requests.length} pending request{requests.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'PENDING', 'ACCEPTED', 'DECLINED'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    statusFilter === s ? 'glass-button text-white' : 'glass-button-outline'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-xl border px-4 py-3 text-sm font-medium" style={{ borderColor: 'color-mix(in srgb, var(--purple-bright) 30%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 10%, transparent)', color: 'var(--purple-bright)' }}>{message}</div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(260px,1fr)]">
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--purple-bright)' }} /><div className="absolute inset-0 animate-ping opacity-20"><Loader2 className="h-8 w-8" style={{ color: 'var(--purple-bright)' }} /></div></div>
              </div>
            ) : fr.length === 0 ? (
              <section className="glass-panel p-12 text-center">
                <Send className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>No pending requests</h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>You are all caught up. New task requests will appear here.</p>
              </section>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {fr.map((item) => (
                  <motion.article key={item.id} className="glass-panel-light p-5" whileHover={{ y: -3 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{item.title}</h2>
                        {role === 'ADMIN' ? (
                          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2" style={{ color: 'var(--text-muted)' }}>
                            <span className="rounded-lg px-2 py-1" style={{ backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>From:</span> {item.sender.name ?? item.sender.email}
                            </span>
                            <span className="rounded-lg px-2 py-1" style={{ backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>To:</span> {item.receiver.name ?? item.receiver.email}
                            </span>
                          </div>
                        ) : (
                          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Requested by {item.sender.name ?? item.sender.email}</p>
                        )}
                        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                      </div>
                      <span className="status-badge" style={{
                        color: 'var(--purple-bright)',
                        backgroundColor: 'color-mix(in srgb, var(--purple-bright) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--purple-bright) 20%, transparent)'
                      }}>{item.status}</span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleRequestAction(item.id, 'accept')} disabled={processing === item.id}
                        className="glass-button flex-1 inline-flex items-center justify-center gap-2">
                        {processing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />} Accept
                      </button>
                      <button onClick={() => handleRequestAction(item.id, 'decline')} disabled={processing === item.id}
                        className="glass-button-outline flex-1 inline-flex items-center justify-center gap-2">
                        {processing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle size={16} />} Decline
                      </button>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>

          <aside className="h-fit glass-panel p-4 lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-3" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
              <Activity size={14} /> Active Tasks
            </div>
            <div className="space-y-3">
              {activeTasks.length === 0 ? (
                <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: 'var(--text-muted)' }}>No active org tasks right now.</div>
              ) : activeTasks.map((task) => {
                const initials = (task.assignedTo?.name ?? task.assignedTo?.email ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={task.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ backgroundColor: 'color-mix(in srgb, var(--purple-bright) 15%, transparent)', color: 'var(--purple-bright)' }}>{initials}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.assignedTo?.name ?? task.assignedTo?.email ?? 'Unassigned'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="rounded-full border px-2 py-1 font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--status-active) 20%, transparent)', backgroundColor: 'color-mix(in srgb, var(--status-active) 10%, transparent)', color: 'var(--status-active)' }}>Active</span>
                      <span className="rounded-full border px-2 py-1 font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 60%, transparent)', color: 'var(--text-muted)' }}>{task.priority}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{task.minutesRemaining}m left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        {role === 'ADMIN' && (
          <section className="grid gap-5 lg:grid-cols-2">
            <div className="glass-panel p-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-3" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                <Clock size={14} /> Leave Requests
              </div>
              <div className="space-y-2">
                {leaves.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No leave requests.</p> : leaves.slice(0, 5).map((leave) => (
                  <div key={leave.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{leave.reason}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{leave.user?.name ?? leave.user?.email} - {leave.status}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel p-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-3" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                <CheckCircle2 size={14} /> Proof Approvals
              </div>
              <div className="space-y-2">
                {approvals.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No pending proof approvals.</p> : approvals.slice(0, 5).map((approval) => (
                  <div key={approval.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{approval.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{approval.assignedTo?.name ?? approval.assignedTo?.email}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}