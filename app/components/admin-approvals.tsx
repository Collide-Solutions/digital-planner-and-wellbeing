'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Eye, Clock, User, FileText, AlertCircle, Loader2, Sparkles, ChevronRight, X } from 'lucide-react';

interface PendingTask {
  id: string;
  title: string;
  description: string;
  proofUrl?: string;
  currentHour: number;
  assignedTo: { name: string; email: string; };
  createdAt: string;
}

interface AdminApprovalsProps { onTaskAction?: () => void; }

export function AdminApprovals({ onTaskAction }: AdminApprovalsProps) {
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<PendingTask | null>(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => { fetchPendingTasks(); }, []);

  const fetchPendingTasks = async () => {
    try {
      const r = await fetch('/api/admin/pending-approvals');
      const d = await r.json();
      setPendingTasks(d.tasks || []);
    } catch (e) { console.error('Failed to fetch pending tasks:', e); }
    finally { setLoading(false); }
  };

  const handleApproval = async (taskId: string, action: 'approve' | 'reject') => {
    setProcessing(taskId);
    try {
      const r = await fetch(`/api/tasks/${taskId}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback: action === 'reject' ? feedback : undefined })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Action failed');
      setPendingTasks(prev => prev.filter(t => t.id !== taskId));
      setSelectedTask(null); setFeedback('');
      if (onTaskAction) onTaskAction();
    } catch (e) { console.error('Approval action failed:', e); alert('Action failed. Please try again.'); }
    finally { setProcessing(null); }
  };

  const formatDate = (ds: string) => new Date(ds).toLocaleString();

  if (loading) {
    return (
      <div className="rounded-2xl glass-panel p-6">
        <div className="flex items-center justify-center py-12">
          <div className="relative"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--purple-bright)' }} /><div className="absolute inset-0 animate-ping opacity-20"><Loader2 className="h-8 w-8" style={{ color: 'var(--purple-bright)' }} /></div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 lg:p-8">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#A855F7] to-transparent" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: 'color-mix(in srgb, var(--purple-bright) 6%, transparent)' }} />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-3" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                <Sparkles size={14} /> Pending Approvals
              </div>
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Review & Approve Tasks</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Submitted tasks awaiting your approval</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border px-4 py-2" style={{ borderColor: 'color-mix(in srgb, var(--status-pending) 20%, transparent)', backgroundColor: 'color-mix(in srgb, var(--status-pending) 8%, transparent)' }}>
              <Clock size={16} style={{ color: 'var(--status-pending)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--status-pending)' }}>{pendingTasks.length} pending</span>
            </div>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border" style={{ backgroundColor: 'color-mix(in srgb, var(--status-done) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--status-done) 15%, transparent)' }}>
                  <CheckCircle size={32} style={{ color: 'var(--status-done)' }} />
                </div>
              </div>
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>All clear!</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>No pending approvals at this time</p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <AnimatePresence>
                {pendingTasks.map((task, idx) => (
                  <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: idx * 0.05 }}
                    className="group rounded-xl border p-5 transition-all duration-300 hover:border-[rgba(245,158,11,0.25)]" style={{ borderColor: 'color-mix(in srgb, var(--status-pending) 12%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 50%, transparent)' }}>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{task.title}</h4>
                          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--status-pending) 20%, transparent)', backgroundColor: 'color-mix(in srgb, var(--status-pending) 8%, transparent)', color: 'var(--status-pending)' }}><Clock size={12} />Hour {9 + task.currentHour}:00</span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--purple-bright) 15%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}><AlertCircle size={12} />Pending Review</span>
                        </div>
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <div className="flex items-center gap-1.5">
                            <User size={14} style={{ color: 'var(--purple-bright)' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{task.assignedTo.name}</span>
                            <span>({task.assignedTo.email})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={14} style={{ color: '#7C3AED' }} />
                            <span>Submitted {formatDate(task.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.proofUrl && (
                          <button onClick={() => window.open(task.proofUrl, '_blank')}
                            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-300 hover:border-[rgba(168,85,247,0.3)]"
                            style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-secondary)' }}>
                            <Eye size={14} /> Proof
                          </button>
                        )}
                        <button onClick={() => setSelectedTask(task)} className="inline-flex items-center gap-1.5 glass-button text-xs px-4 py-2">Review <ChevronRight size={14} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
            <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-2xl glass-panel p-6" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'color-mix(in srgb, var(--panel-bg) 96%, transparent)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border" style={{ backgroundColor: 'color-mix(in srgb, var(--status-pending) 12%, transparent)', borderColor: 'color-mix(in srgb, var(--status-pending) 20%, transparent)' }}>
                    <AlertCircle size={20} style={{ color: 'var(--status-pending)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Review Task</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Make an approval decision</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="flex h-8 w-8 items-center justify-center rounded-lg transition-all" style={{ color: 'var(--text-muted)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(168,85,247,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-5">
                <div className="rounded-xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                  <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{selectedTask.title}</h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedTask.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1.5"><User size={14} style={{ color: 'var(--purple-bright)' }} /><span style={{ color: 'var(--text-secondary)' }}>By: {selectedTask.assignedTo.name}</span></span>
                  <span className="flex items-center gap-1.5"><Clock size={14} style={{ color: '#7C3AED' }} /><span style={{ color: 'var(--text-secondary)' }}>Hour: {9 + selectedTask.currentHour}:00</span></span>
                </div>
                {selectedTask.proofUrl && (
                  <div className="rounded-xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 40%, transparent)' }}>
                    <div className="flex items-center gap-2 mb-2"><FileText size={16} style={{ color: 'var(--purple-bright)' }} /><span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Proof of completion</span></div>
                    <button onClick={() => window.open(selectedTask.proofUrl, '_blank')} className="inline-flex items-center gap-1.5 text-xs transition-colors" style={{ color: 'var(--purple-bright)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--purple-soft)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--purple-bright)'}><Eye size={14} /> View proof file</button>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-2 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Feedback (optional for rejections)</label>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Add feedback for the team member..."
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all resize-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} rows={3} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => handleApproval(selectedTask.id, 'reject')} disabled={!!processing}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    style={{ borderColor: 'rgba(255,77,157,0.2)', backgroundColor: 'rgba(255,77,157,0.08)', color: '#FF4D9D' }}>
                    {processing === selectedTask.id ? <Loader2 size={16} className="animate-spin" /> : <><XCircle size={16} /> Reject</>}
                  </button>
                  <button onClick={() => handleApproval(selectedTask.id, 'approve')} disabled={!!processing}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#A855F7] py-3 text-sm font-medium text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.45)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                    {processing === selectedTask.id ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Approve</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}