'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Check, FileText, Loader2, Lock, MoreVertical, Plus, Send, UserRound,
  Activity, Users, CalendarCheck, Target, TrendingUp, Clock, Sparkles,
  AlertCircle, Circle, X, ExternalLink, UserCheck, Briefcase, BarChart3,
  ChevronRight, Eye, CheckCircle, XCircle, LogOut
} from 'lucide-react';
import { AdminApprovals } from '../components/admin-approvals';
import { ProofUpload } from '../components/proof-upload';
import { getCurrentHour, getShiftSlots, parseShiftHour, processTasksForUser, ProcessedTask } from '@/lib/task-engine';

type EmployeeOption = { id: string; name: string | null; email: string; department: string | null };
type TaskRequest = {
  id: string;
  title: string;
  description: string;
  sender: { name: string | null; email: string };
  receiver: { name: string | null; email: string };
};
type TeamTask = ProcessedTask & { assignedBy?: { name: string | null; email: string } | null };
type TeamEmployee = EmployeeOption & { shiftStart: string | null; shiftEnd: string | null; tasks: TeamTask[] };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

function StatusBadge({ status }: { status: string }) {
  const cls = (() => {
    switch(status) {
      case 'CRITICAL': return 'status-badge-critical';
      case 'HIGH': case 'ACTIVE': return 'status-badge-active';
      case 'MEDIUM': case 'WAITING_APPROVAL': return 'status-badge-pending';
      case 'LOW': case 'COMPLETED': case 'APPROVED': return 'status-badge-done';
      default: return 'status-badge-active';
    }
  })();
  return (
    <span className={cls}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status === 'WAITING_APPROVAL' ? 'Pending' : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function normalizeTask(task: any): ProcessedTask {
  return {
    ...task,
    deadline: task.deadline ? new Date(task.deadline) : null,
  };
}

function KPICard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.01 }} className="kpi-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--purple-bright) 12%, transparent)' }}>
          <Icon size={18} style={{ color: 'var(--purple-bright)' }} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{value}</span>
        {sub && <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<ProcessedTask[]>([]);
  const [shift, setShift] = useState({ start: '09:00', end: '18:00' });
  const [role, setRole] = useState<string>();
  const [requestCount, setRequestCount] = useState(0);
  const [requests, setRequests] = useState<TaskRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [teamEmployees, setTeamEmployees] = useState<TeamEmployee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<TeamEmployee | null>(null);
  const [editingTask, setEditingTask] = useState<TeamTask | null>(null);
  const [editForm, setEditForm] = useState({ assignedToId: '', priority: 'MEDIUM', status: 'ACTIVE', currentHour: '', requiresProof: true });
  const [selectedTask, setSelectedTask] = useState<ProcessedTask | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', requiresProof: true, assignedToId: '', currentHour: '' });
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentHour = getCurrentHour(shift.start, shift.end);
  const shiftSlots = getShiftSlots(shift.start, shift.end);
  const currentTask = tasks.find((t) => t.isCurrent) ?? tasks.find((t) => t.status === 'ACTIVE') ?? tasks[0];
  const nextTask = tasks.find((t) => t.currentHour > (currentTask?.currentHour ?? currentHour));
  const pendingApprovals = tasks.filter((t) => t.status === 'WAITING_APPROVAL');
  const completedCount = tasks.filter((t) => t.displayStatus === 'COMPLETED').length;
  const productivity = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const shiftLogged = Math.max(0, currentHour + 1);
  const firstAnnouncement = announcements[0];
  const taskByHour = useMemo(() => new Map(tasks.map((t) => [t.currentHour, t])), [tasks]);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const r = await fetch('/api/tasks');
      const d = await r.json();
      const ns = d.shift ?? { start: '09:00', end: '18:00' };
      setShift(ns); setRole(d.role);
      const normalizedTasks = (d.tasks || []).map(normalizeTask);
      setTasks(processTasksForUser(normalizedTasks, getCurrentHour(ns.start, ns.end)));
      const [rr, ar] = await Promise.all([fetch('/api/task-requests'), fetch('/api/announcements')]);
      if (rr.ok) { const rd = await rr.json(); setRequests(rd.requests || []); setRequestCount((rd.requests || []).length); }
      if (ar.ok) { const ad = await ar.json(); setAnnouncements((ad.announcements || []).slice(0, 2)); }
      if (d.role === 'ADMIN') {
        const ur = await fetch('/api/users');
        if (ur.ok) { const ud = await ur.json(); setEmployees(ud.users || []); }
        const tr = await fetch('/api/admin/team-tasks');
        if (tr.ok) {
          const td = await tr.json();
          const p = (td.employees || []).map((e: TeamEmployee) => ({
            ...e,
            tasks: processTasksForUser((e.tasks || []).map(normalizeTask), getCurrentHour(e.shiftStart ?? '09:00', e.shiftEnd ?? '18:00'))
          }));
          setTeamEmployees(p);
          setSelectedEmployee((c) => c ? p.find((e: TeamEmployee) => e.id === c.id) ?? c : null);
        }
      }
    } finally { setLoading(false); }
  };

  const createTask = async () => {
    setTaskError(null); setTaskSaving(true);
    const payload = { ...taskForm, assignedToId: taskForm.assignedToId || undefined, currentHour: taskForm.currentHour === '' ? undefined : Number(taskForm.currentHour) };
    try {
      const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) { const fm = d.fields ? Object.values(d.fields).flat().filter(Boolean).join(' ') : ''; throw new Error(fm || d.error || 'Unable to create task'); }
      setTaskForm({ title: '', description: '', priority: 'MEDIUM', requiresProof: true, assignedToId: '', currentHour: '' });
      setCreatingTask(false); await fetchDashboard();
    } catch (e) { setTaskError(e instanceof Error ? e.message : 'Unable to create task'); }
    finally { setTaskSaving(false); }
  };

  const openCreateTask = () => { setTaskError(null); setCreatingTask(true); };
  const openEditTask = (task: TeamTask) => { setEditingTask(task); setEditForm({ assignedToId: task.assignedToId ?? '', priority: task.priority, status: task.status, currentHour: String(task.currentHour), requiresProof: task.requiresProof }); };
  const saveTaskEdit = async () => {
    if (!editingTask) return;
    const r = await fetch(`/api/tasks/${editingTask.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    if (r.ok) { setEditingTask(null); await fetchDashboard(); }
  };

  const formatHour = (hi: number) => { const h = parseShiftHour(shift.start) + hi; const s = h >= 12 ? 'PM' : 'AM'; const d = h > 12 ? h - 12 : h; return `${d} ${s}`; };

  const ModalOverlay = ({ onClick }: { onClick: () => void }) => <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" onClick={onClick} />;

  const renderTaskModal = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setCreatingTask(false)}>
      <ModalOverlay onClick={() => setCreatingTask(false)} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg rounded-2xl glass-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{role === 'ADMIN' ? 'Assign Task' : 'Create Task'}</h3>
          <button onClick={() => setCreatingTask(false)} style={{ color: 'var(--text-muted)' }} className="hover:opacity-70"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Title</label>
            <input value={taskForm.title} onChange={(e) => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Enter task title..."
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Description</label>
            <textarea value={taskForm.description} onChange={(e) => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the task..." rows={3}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all resize-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
          </div>
          {role === 'ADMIN' && (
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Assign To</label>
              <select value={taskForm.assignedToId} onChange={(e) => setTaskForm(f => ({ ...f, assignedToId: e.target.value }))}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none appearance-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                <option value="" style={{ backgroundColor: 'var(--bg-secondary)' }}>Assign to myself</option>
                {employees.map(e => <option key={e.id} value={e.id} style={{ backgroundColor: 'var(--bg-secondary)' }}>{e.name ?? e.email}{e.department ? ` — ${e.department}` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Priority</label>
              <select value={taskForm.priority} onChange={(e) => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none appearance-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p} style={{ backgroundColor: 'var(--bg-secondary)' }}>{p.charAt(0)+p.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Hour Slot</label>
              <input type="number" min="0" max="23" value={taskForm.currentHour} onChange={(e) => setTaskForm(f => ({ ...f, currentHour: e.target.value }))} placeholder="Auto"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 60%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 40%, transparent)' }}>
            <input type="checkbox" checked={taskForm.requiresProof} onChange={(e) => setTaskForm(f => ({ ...f, requiresProof: e.target.checked }))} className="w-4 h-4 rounded accent-[#A855F7]" />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Requires proof of completion</span>
          </label>
          {taskError && <div className="rounded-xl border border-[rgba(255,77,157,0.2)] bg-[rgba(255,77,157,0.08)] px-4 py-3 text-sm text-[#FF4D9D]">{taskError}</div>}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => setCreatingTask(false)} className="glass-button-outline flex-1">Cancel</button>
          <button onClick={createTask} disabled={taskSaving} className="glass-button flex-1">
            {taskSaving ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Saving...</span> : (role === 'ADMIN' ? 'Assign Task' : 'Create Task')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative"><Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--purple-bright)' }} /><div className="absolute inset-0 animate-ping opacity-20"><Loader2 className="h-10 w-10" style={{ color: 'var(--purple-bright)' }} /></div></div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (role === 'ADMIN') {
    const ae = teamEmployees.filter((e) => e.tasks.some((t) => t.status === 'ACTIVE')).length;
    const tt = teamEmployees.reduce((s, e) => s + e.tasks.length, 0);
    const tc = teamEmployees.reduce((s, e) => s + e.tasks.filter((t) => t.displayStatus === 'COMPLETED').length, 0);
    const tp = tt ? Math.round((tc / tt) * 100) : 0;

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <motion.section variants={itemVariants} className="relative overflow-hidden rounded-3xl glass-panel p-8">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: 'color-mix(in srgb, var(--purple-bright) 10%, transparent)' }} />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none" style={{ backgroundColor: 'color-mix(in srgb, var(--purple-primary) 8%, transparent)' }} />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-4" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                <Sparkles size={14} /> Admin Control Center
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Employee <span className="gradient-text">Command Center</span></h1>
              <p className="mt-2 text-base max-w-2xl" style={{ color: 'var(--text-muted)' }}>Monitor real-time team activity, assign and manage tasks, review submissions, and track productivity across your entire workforce.</p>
            </div>
            <button onClick={openCreateTask} className="inline-flex items-center gap-2 glass-button text-base px-6 py-3 shrink-0"><Plus size={18} /> Assign Task</button>
          </div>
          <div className="relative z-10 mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard icon={Users} label="Team Members" value={teamEmployees.length} sub="Active workforce" />
            <KPICard icon={Activity} label="Active Now" value={ae} sub={`${teamEmployees.length - ae} idle`} />
            <KPICard icon={Target} label="Total Tasks" value={tt} sub={`${tc} completed`} />
            <KPICard icon={TrendingUp} label="Productivity" value={`${tp}%`} sub="Team performance" />
          </div>
        </motion.section>

        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-6">
            <div><h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Team Overview</h2><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click any card to manage employee tasks</p></div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22C55E]" /> Active</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Pending</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#7C3AED]" /> Idle</span>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {teamEmployees.map((employee) => {
              const at = employee.tasks.find((t) => t.status === 'ACTIVE') ?? employee.tasks[0];
              const done = employee.tasks.filter((t) => t.displayStatus === 'COMPLETED').length;
              const pend = employee.tasks.filter((t) => t.status === 'WAITING_APPROVAL').length;
              const locked = employee.tasks.filter((t) => t.status === 'LOCKED').length;
              const ia = employee.tasks.some((t) => t.status === 'ACTIVE');
              const hp = pend > 0;
              return (
                <motion.button key={employee.id} variants={itemVariants} whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedEmployee(employee)}
                  className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(168,85,247,0.12),0_8px_32px_rgba(0,0,0,0.2),0_0_40px_rgba(168,85,247,0.1)]"
                  style={{ border: '1px solid color-mix(in srgb, var(--glass-border) 60%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 85%, transparent)', backdropFilter: 'blur(12px)' }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#A855F7] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${ia ? 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.5)]' : hp ? 'bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-[#7C3AED] shadow-[0_0_8px_rgba(124,58,237,0.3)]'}`} />
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] shadow-[0_0_16px_rgba(168,85,247,0.3)]"><UserRound size={22} className="text-white" /></div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base truncate" style={{ color: 'var(--text-primary)' }}>{employee.name ?? employee.email}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{employee.department ?? 'Team Member'}</p>
                    </div>
                    <div className="shrink-0">
                      <span className="inline-flex items-center justify-center min-w-[3rem] rounded-full border px-2.5 py-1 text-xs font-bold" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>{employee.tasks.length}</span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border p-4 transition-all duration-300 group-hover:border-[rgba(168,85,247,0.15)]" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 50%, transparent)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--text-muted)' }}>Current Task</p>
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{at?.title || <span style={{ color: 'var(--text-muted)' }} className="italic">No task assigned</span>}</p>
                    {at && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{at.priority} priority</p>}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-[rgba(34,197,94,0.12)] bg-[rgba(34,197,94,0.06)] p-2 text-center"><p className="text-sm font-bold text-[#22C55E]">{done}</p><p className="text-[10px] text-[#7C7698] uppercase tracking-[0.08em]">Done</p></div>
                    <div className="rounded-lg border border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.06)] p-2 text-center"><p className="text-sm font-bold text-[#F59E0B]">{pend}</p><p className="text-[10px] text-[#7C7698] uppercase tracking-[0.08em]">Pending</p></div>
                    <div className="rounded-lg border border-[rgba(124,58,237,0.12)] bg-[rgba(124,58,237,0.06)] p-2 text-center"><p className="text-sm font-bold text-[#7C3AED]">{locked}</p><p className="text-[10px] text-[#7C7698] uppercase tracking-[0.08em]">Locked</p></div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        <motion.section variants={itemVariants}><AdminApprovals onTaskAction={fetchDashboard} /></motion.section>

        <AnimatePresence>
          {selectedEmployee && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEmployee(null)}>
              <ModalOverlay onClick={() => setSelectedEmployee(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative max-h-[88vh] w-full max-w-4xl overflow-auto rounded-2xl glass-panel p-6 lg:p-8" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.3)]"><UserRound size={26} className="text-white" /></div>
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-2" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>Employee Panel</div>
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedEmployee.name ?? selectedEmployee.email}</h2>
                      <p style={{ color: 'var(--text-muted)' }}>{selectedEmployee.department ?? 'Team'} · {selectedEmployee.email}</p>
                    </div>
                  </div>
                  <button onClick={() => { setTaskForm(f => ({ ...f, assignedToId: selectedEmployee.id })); setSelectedEmployee(null); openCreateTask(); }} className="inline-flex items-center gap-2 glass-button shrink-0"><Plus size={16} /> Assign Task</button>
                </div>
                <div className="mt-8 space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>Tasks · {selectedEmployee.tasks.length}</h3>
                  {selectedEmployee.tasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 60%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 40%, transparent)' }}>
                      <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} /><p style={{ color: 'var(--text-muted)' }}>No tasks assigned today.</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {selectedEmployee.tasks.map((task, idx) => (
                        <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          className="group rounded-xl border p-5 transition-all duration-300 hover:border-[rgba(168,85,247,0.2)]"
                          style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 mb-2"><h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{task.title}</h4><StatusBadge status={task.priority} /></div>
                              {task.description && <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>{task.description}</p>}
                              <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                <span className="flex items-center gap-1"><UserCheck size={12} />{task.assignedBy?.name ?? task.assignedBy?.email ?? 'Admin'}</span>
                                <span className="flex items-center gap-1"><Clock size={12} />Hour {task.currentHour}</span>
                                <StatusBadge status={task.status} />
                              </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); openEditTask(task); }} className="inline-flex items-center gap-2 glass-button-outline text-xs shrink-0">Manage <ChevronRight size={14} /></button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingTask && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setEditingTask(null)}>
              <ModalOverlay onClick={() => setEditingTask(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg rounded-2xl glass-panel p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2"><h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Task</h3><button onClick={() => setEditingTask(null)} style={{ color: 'var(--text-muted)' }} className="hover:opacity-70"><X size={20} /></button></div>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{editingTask.title}</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Assign To</label>
                    <select value={editForm.assignedToId} onChange={(e) => setEditForm(f => ({ ...f, assignedToId: e.target.value }))}
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none appearance-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                      {employees.map(e => <option key={e.id} value={e.id} style={{ backgroundColor: 'var(--bg-secondary)' }}>{e.name ?? e.email}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium mb-1.5 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Priority</label>
                      <select value={editForm.priority} onChange={(e) => setEditForm(f => ({ ...f, priority: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-3 text-sm outline-none appearance-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                        {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} style={{ backgroundColor: 'var(--bg-secondary)' }}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Status</label>
                      <select value={editForm.status} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-3 text-sm outline-none appearance-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                        {['LOCKED','ACTIVE','WAITING_APPROVAL','APPROVED','COMPLETED'].map(s => <option key={s} style={{ backgroundColor: 'var(--bg-secondary)' }}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5 uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Hour</label>
                      <input type="number" value={editForm.currentHour} onChange={(e) => setEditForm(f => ({ ...f, currentHour: e.target.value }))}
                        className="w-full rounded-xl border px-3 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 60%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 40%, transparent)' }}>
                    <input type="checkbox" checked={editForm.requiresProof} onChange={(e) => setEditForm(f => ({ ...f, requiresProof: e.target.checked }))} className="w-4 h-4 rounded accent-[#A855F7]" />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Requires proof</span>
                  </label>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setEditingTask(null)} className="glass-button-outline flex-1">Cancel</button>
                  <button onClick={saveTaskEdit} className="glass-button flex-1">Save Changes</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{creatingTask && renderTaskModal()}</AnimatePresence>
      </motion.div>
    );
  }

  // Non-admin view
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <main className="hidden md:block">
        <motion.section variants={itemVariants} className="relative overflow-hidden rounded-3xl glass-panel">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)' }} />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4 lg:px-8" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)' }}>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Welcome, {session?.user?.name ?? 'Member'}</span>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-muted)' }} />
              <span className="font-medium" style={{ color: 'var(--purple-bright)' }}>{role === 'ADMIN' ? 'Admin Team' : 'Dev Team'}</span>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Shift: {formatHour(0)} — {formatHour(shiftSlots.length - 1)}</span>
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Logged: <span className="font-semibold" style={{ color: 'var(--status-pending)' }}>{shiftLogged}.5 hrs</span></span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}><span className="font-semibold" style={{ color: 'var(--status-pending)' }}>{pendingApprovals.length}</span> pending</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                <BarChart3 size={12} />{productivity}% Stats
              </span>
            </div>
          </div>

          <div className="relative z-10 grid gap-5 gap-x-[30px] p-6 lg:grid-cols-[0.6fr_1.6fr_1fr] lg:p-8">
            <aside className="rounded-xl border p-5 transition-all duration-300" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] mb-5" style={{ color: 'var(--purple-bright)' }}>Hourly Timeline</h2>
              <div className="space-y-2">
                {shiftSlots.map((hi) => {
                  const task = taskByHour.get(hi);
                  const ic = hi === currentHour;
                  const ip = hi < currentHour;
                  const ic2 = task?.displayStatus === 'COMPLETED';
                  return (
                    <div key={hi} className="flex items-center gap-3 py-1.5">
                      <span className={`text-xs font-medium w-14 shrink-0 ${ic ? '' : ''}`} style={{ color: ic ? 'var(--purple-bright)' : 'var(--text-muted)' }}>{formatHour(hi)}</span>
                      <div className={`flex-1 h-px transition-all duration-300`} style={{ backgroundColor: ic ? 'var(--purple-bright)' : ic2 ? '#22C55E' : ip ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.08)', boxShadow: ic ? '0 0 6px rgba(168,85,247,0.5)' : 'none' }} />
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300`}
                        style={{ borderColor: ic ? 'var(--purple-bright)' : ic2 || ip ? '#22C55E' : 'rgba(168,85,247,0.2)', backgroundColor: ic ? 'var(--purple-bright)' : ic2 || ip ? '#22C55E' : 'transparent', boxShadow: ic ? '0 0 12px rgba(168,85,247,0.6)' : 'none' }}>
                        {(ic2 || (ip && !ic)) && <Check size={12} className="text-white" />}
                        {ic && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            <section className="space-y-5">
              <div className="rounded-xl border p-5 transition-all duration-300" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--purple-bright)' }}>Current Task</h2><MoreVertical size={16} style={{ color: 'var(--text-muted)' }} /></div>
                <div className="relative overflow-hidden rounded-xl border p-5" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 60%, transparent)', background: 'var(--gradient-card)' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] pointer-events-none" style={{ backgroundColor: 'color-mix(in srgb, var(--purple-bright) 6%, transparent)' }} />
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{currentTask?.title ?? 'No active task'}</h3>
                    <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><circle cx="4" cy="4" r="4" fill="var(--purple-bright)"/></svg>
                      Priority: {currentTask?.priority ? currentTask.priority[0] + currentTask.priority.slice(1).toLowerCase() : 'Medium'}
                    </span>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button onClick={() => currentTask && setSelectedTask(currentTask)} disabled={!currentTask || !currentTask.canAccess || currentTask.status === 'WAITING_APPROVAL'}
                        className="glass-button inline-flex items-center gap-2"><Send size={16} /> Request Approval</button>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Attach proof & submit for review</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-5 transition-all duration-300" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--purple-bright)' }}>Task Queue</h2>
                  <span className="inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>{tasks.length}</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {tasks.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)' }}><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tasks assigned yet.</p></div> : (
                    tasks.map((task) => (
                      <motion.button key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        onClick={() => task.canAccess && setSelectedTask(task)}
                        className="group w-full rounded-xl border p-4 text-left transition-all duration-300 hover:border-[rgba(168,85,247,0.18)] hover:bg-[rgba(18,12,35,0.6)]"
                        style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 30%, transparent)' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{(task as any).assignedBy?.name ?? (task as any).assignedBy?.email ?? 'Admin'} · {formatHour(task.currentHour)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0"><StatusBadge status={task.priority} /><StatusBadge status={task.status} /></div>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-xl border p-5 transition-all duration-300" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--purple-bright)' }}>Quick Actions</h2>
                <button onClick={openCreateTask} className="glass-button w-full inline-flex items-center justify-center gap-2"><Plus size={16} /> Create Task</button>
                <p className="mt-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Create a new task or request</p>
              </section>

              <section className="rounded-xl border p-5 transition-all duration-300" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--purple-bright)' }}>Requests</h2><span className="text-xs font-medium" style={{ color: 'var(--purple-bright)' }}>Incoming</span></div>
                <div className="space-y-3">
                  {requests.length === 0 ? <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)' }}><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No incoming requests</p></div> : (
                    requests.slice(0, 2).map((req) => (
                      <Link key={req.id} href="/requests" className="block rounded-xl border p-4 transition-all duration-300 hover:border-[rgba(168,85,247,0.18)]"
                        style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 30%, transparent)' }}>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{req.title}</p>
                        <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <p><span style={{ color: 'var(--text-secondary)' }}>From:</span> {req.sender.name ?? req.sender.email}</p>
                          <p><span style={{ color: 'var(--text-secondary)' }}>To:</span> {req.receiver.name ?? req.receiver.email}</p>
                        </div>
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>Review <ChevronRight size={12} /></span>
                      </Link>
                    ))
                  )}
                  <Link href="/requests" className="glass-button-outline w-full inline-flex items-center justify-center gap-2 text-xs">
                    {requestCount > 0 ? `Review ${requestCount} Request${requestCount !== 1 ? 's' : ''}` : 'Open Requests'} <ChevronRight size={14} />
                  </Link>
                </div>
              </section>

              <section className="rounded-xl border p-5 transition-all duration-300" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                <h2 className="text-sm font-bold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--purple-bright)' }}>Announcements</h2>
                <div className="rounded-xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 30%, transparent)' }}>
                  {firstAnnouncement ? <><p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{firstAnnouncement.title}</p><p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{firstAnnouncement.content}</p></> : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No announcements yet.</p>}
                </div>
              </section>
            </aside>
          </div>
        </motion.section>

        {role === 'ADMIN' && <motion.div variants={itemVariants} className="mt-6"><AdminApprovals onTaskAction={fetchDashboard} /></motion.div>}
      </main>

      {/* Mobile view */}
      <main className="md:hidden">
        <motion.section variants={itemVariants} className="rounded-2xl glass-panel">
          <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] shadow-[0_0_12px_rgba(168,85,247,0.3)]"><Sparkles size={18} className="text-white" /></div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Planner</span>
            </div>
            <button onClick={() => signOut()} className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(255,77,157,0.2)] px-3 py-1.5 text-xs font-semibold text-[#FF4D9D]"><LogOut size={12} /> Log Out</button>
          </div>
          <div className="p-4 space-y-4">
            <div><h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Daily Progress</h1><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Hourly timeline</p></div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{formatHour(0)}</span>
              <div className="flex-1 relative h-8">
                <div className="absolute left-0 right-0 top-4 h-px" style={{ backgroundColor: 'rgba(168,85,247,0.2)' }} />
                <div className="absolute top-1 h-7 px-2 -translate-x-1/2 rounded-lg flex items-center text-center text-[11px] font-semibold" style={{ left: `${Math.min(92, Math.max(8, (currentHour / Math.max(1, shiftSlots.length - 1)) * 100))}%`, backgroundColor: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.2)', color: 'var(--purple-bright)' }}>{formatHour(currentHour)}</div>
              </div>
              <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{formatHour(shiftSlots.length - 1)}</span>
            </div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 60%, transparent)', background: 'var(--gradient-card)' }}>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{currentTask?.title ?? 'No active task'}</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Priority: {currentTask?.priority ? currentTask.priority[0] + currentTask.priority.slice(1).toLowerCase() : 'Medium'}</p>
              <button onClick={() => currentTask && setSelectedTask(currentTask)} disabled={!currentTask || !currentTask.canAccess || currentTask.status === 'WAITING_APPROVAL'}
                className="mt-4 glass-button w-full inline-flex items-center justify-center gap-2"><Send size={16} /> Send Proof</button>
            </motion.div>
          </div>
          <div className="border-t p-4 space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 50%, transparent)' }}>
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Today</h2>
            <div className="space-y-2">
              <div className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 30%, transparent)' }}>
                <p className="text-[10px] uppercase tracking-[0.1em] font-medium" style={{ color: 'var(--text-muted)' }}>Next Task</p>
                <div className="flex items-center justify-between mt-1"><span className="text-sm" style={{ color: 'var(--text-primary)' }}>{nextTask?.title ?? 'No next task'}</span><Lock size={14} style={{ color: 'var(--text-muted)' }} /></div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>({nextTask ? formatHour(nextTask.currentHour) : formatHour(currentHour + 1)})</p>
              </div>
              <div className="rounded-xl border border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.06)] p-3"><span className="text-sm font-medium text-[#F59E0B]">{pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}</span></div>
            </div>
          </div>
        </motion.section>
      </main>

      <AnimatePresence>{selectedTask && <ProofUpload task={selectedTask} onClose={() => setSelectedTask(null)} onUploadSuccess={fetchDashboard} />}</AnimatePresence>
      <AnimatePresence>{creatingTask && renderTaskModal()}</AnimatePresence>
    </motion.div>
  );
}