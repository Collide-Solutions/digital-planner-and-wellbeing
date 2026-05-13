'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, CheckCircle2, ChevronDown, Clock3, Copy, Edit3, FileText, Filter,
  GripVertical, LayoutGrid, ListChecks, Loader2, Lock, MoreVertical, Plus, Search,
  Send, Trash2, Upload, UserRound, X, Sparkles, ChevronRight, Target, Activity,
  CheckSquare, Square, ExternalLink, Paperclip, FileIcon, Download
} from 'lucide-react';
import { getCurrentHour, getShiftSlots, processTasksForUser, ProcessedTask, autoScheduleTasks, getWeekDates, getMonthGrid, getTasksForDate } from '@/lib/task-engine';
import { ProofUpload } from '../components/proof-upload';

type EmployeeOption = { id: string; name: string | null; email: string; department: string | null };
type TaskWithRelations = ProcessedTask & {
  assignedBy?: { name: string | null; email: string } | null;
  assignedTo?: { id: string; name: string | null; email: string; department?: string | null } | null;
  activityLogs?: Array<{ fieldChanged?: string; oldValue?: string | null; newValue?: string | null; changedBy: { name: string | null; email: string }; createdAt: string }>;
};

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const statuses = ['LOCKED', 'ACTIVE', 'WAITING_APPROVAL', 'APPROVED', 'COMPLETED', 'REJECTED'];
const plannerModes = ['Day', 'Week', 'Month'] as const;
const viewModes = ['Table', 'Kanban', 'Compact'] as const;

function personName(user?: { name: string | null; email: string } | null) {
  return user?.name ?? user?.email ?? 'Unassigned';
}

function normalizeTask(task: any): TaskWithRelations {
  return {
    ...task,
    deadline: task.deadline ? new Date(task.deadline) : null,
    activityLogs: (task.activityLogs || []).map((log: any) => ({ ...log, createdAt: new Date(log.createdAt).toISOString() })),
  };
}

function DraggableTaskBlock({ task, disabled }: { task: TaskWithRelations; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled, data: { task } });
  const transformStyle = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const accent = (() => {
    switch (task.priority) {
      case 'CRITICAL': return { border: 'rgba(248,113,113,0.65)', shadow: '0 0 22px rgba(248,113,113,0.18)', marker: '#f43f5e' };
      case 'HIGH': return { border: 'rgba(249,115,22,0.55)', shadow: '0 0 20px rgba(249,115,22,0.16)', marker: '#fb923c' };
      case 'MEDIUM': return { border: 'rgba(20,184,166,0.45)', shadow: '0 0 18px rgba(20,184,166,0.14)', marker: '#2dd4bf' };
      default: return { border: 'rgba(148,163,184,0.35)', shadow: '0 0 14px rgba(148,163,184,0.10)', marker: '#94a3b8' };
    }
  })();
  const overdueClass = task.isOverdue ? 'animate-pulse shadow-red-500/20' : '';
  const baseStyle = {
    borderColor: accent.border,
    backgroundColor: 'color-mix(in srgb, var(--card-bg) 40%, transparent)',
    boxShadow: isDragging ? '0 0 38px rgba(148,163,184,0.18)' : accent.shadow,
    ...(transformStyle || {}),
  };

  return (
    <button ref={setNodeRef} style={baseStyle} {...listeners} {...attributes}
      className={`group w-full rounded-xl border p-2.5 text-left text-xs transition-all duration-200 ${
        isDragging ? 'z-50 opacity-80' : ''
      } ${overdueClass} ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-grab active:cursor-grabbing'}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent.marker }}>
          {task.priority === 'CRITICAL' && <span className="absolute inset-0 rounded-full animate-pulse opacity-70" style={{ backgroundColor: accent.marker }} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{personName(task.assignedTo)}</p>
        </div>
        {task.status === 'WAITING_APPROVAL' && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--status-pending)' }} />}
        {(task.status === 'APPROVED' || task.status === 'COMPLETED') && <CheckCircle2 size={13} style={{ color: 'var(--status-done)' }} />}
      </div>
    </button>
  );
}

function PlannerSlot({ hour, label, current, children }: { hour: number; label: string; current: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${hour}`, data: { hour } });
  const slotBorderColor = isOver ? 'var(--purple-bright)' : current ? 'var(--purple-bright)' : 'color-mix(in srgb, var(--glass-border) 60%, transparent)';
  const slotBg = isOver ? 'color-mix(in srgb, var(--purple-bright) 15%, transparent)' : current ? 'color-mix(in srgb, var(--purple-bright) 8%, transparent)' : 'color-mix(in srgb, var(--card-bg) 40%, transparent)';
  return (
    <div ref={setNodeRef}
      className="relative grid min-h-20 grid-cols-[58px_1fr] gap-3 rounded-xl border p-3 transition-all duration-200"
      style={{
        borderColor: slotBorderColor,
        backgroundColor: slotBg,
        boxShadow: current ? '0 0 32px rgba(168,85,247,0.15)' : 'none',
        transform: isOver ? 'scale(1.01)' : 'none',
      }}>
      <div className="text-xs font-semibold" style={{ color: current ? 'var(--purple-bright)' : 'var(--text-muted)' }}>{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PlannerDateZone({ date, selected, compact, children }: { date: Date; selected?: boolean; compact?: boolean; children: React.ReactNode }) {
  const isoDate = date.toISOString().slice(0, 10);
  const { setNodeRef, isOver } = useDroppable({ id: `date-${isoDate}`, data: { date: isoDate } });
  const borderColor = isOver ? 'var(--purple-bright)' : selected ? 'var(--purple-bright)' : 'var(--glass-border)';
  const bg = isOver ? 'color-mix(in srgb, var(--purple-bright) 12%, transparent)' : selected ? 'color-mix(in srgb, var(--purple-bright) 8%, transparent)' : 'color-mix(in srgb, var(--card-bg) 40%, transparent)';
  return (
    <div ref={setNodeRef}
      className="relative grid gap-3 rounded-xl border p-2 transition-all duration-200"
      style={{ borderColor, backgroundColor: bg, minHeight: compact ? 92 : undefined }}>
      {children}
    </div>
  );
}

/** Checklist component - displays checkable steps that flow left to right, sequential forward-only */
function ChecklistDisplay({ task, onToggle, compact }: { task: TaskWithRelations; onToggle: (field: string, value: boolean) => Promise<void>; compact?: boolean }) {
  const items = [
    { key: 'checklistReviewed', label: 'Reviewed the task', done: task.checklistReviewed },
    { key: 'checklistRequirementsRecieved', label: 'All requirements received', done: task.checklistRequirementsRecieved },
    { key: 'checklistStarted', label: 'Starting work', done: task.checklistStarted },
    { key: 'checklistCompleted', label: 'Completed', done: task.checklistCompleted },
  ];

  // Determine the next item that should be completed (sequential forward-only)
  const lastDoneIndex = items.reduce((last, item, idx) => item.done ? idx : last, -1);

  if (compact) {
    const doneCount = items.filter(i => i.done).length;
    const isComplete = doneCount === 4;
    return (
      <div className="flex items-center gap-1">
        {items.map((item, idx) => (
          <div key={item.key} className={`h-2 w-4 rounded-full transition-all ${item.done ? 'bg-green-500' : idx === lastDoneIndex + 1 ? 'bg-amber-400 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`}
            title={item.label} />
        ))}
        {isComplete && <CheckCircle2 size={13} className="ml-1" style={{ color: 'var(--status-done)' }} />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {items.map((item, idx) => {
        // Can only check if it's the next unchecked item (sequential forward)
        const canCheck = idx === lastDoneIndex + 1 && !item.done;
        // Can uncheck only if it's the last done item (sequential backward prevention)
        const canUncheck = false; // no unchecking - forward only

        return (
          <button
            key={item.key}
            onClick={() => {
              if (canCheck) onToggle(item.key, true);
            }}
            disabled={!canCheck && !item.done}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
              item.done
                ? 'bg-green-500/10 border-green-500/30'
                : canCheck
                  ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer'
                  : 'bg-gray-500/5 border-gray-500/20 cursor-not-allowed opacity-50'
            } border`}
            style={{
              borderColor: item.done ? 'rgba(34,197,94,0.3)' : canCheck ? 'rgba(245,158,11,0.3)' : 'var(--glass-border)',
              color: item.done ? 'var(--status-done)' : canCheck ? 'rgb(245,158,11)' : 'var(--text-muted)'
            }}
            title={!canCheck && !item.done ? 'Complete previous step first' : item.label}
          >
            {item.done ? <CheckCircle2 size={14} /> : <div className={`h-3 w-3 rounded-full border-2 ${canCheck ? 'border-amber-400' : 'border-gray-400'}`} />}
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Full task detail modal for "Open" action */
function TaskDetailModal({ task, onClose }: { task: TaskWithRelations; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ y: 18, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, scale: 0.97 }}
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl glass-panel p-6" onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'color-mix(in srgb, var(--panel-bg) 96%, transparent)' }}>
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 60%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>{task.priority}</span>
              <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: task.status === 'COMPLETED' ? 'var(--status-done)' : 'var(--text-muted)' }}>{task.status}</span>
              {task.estimatedHours && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Est. {task.estimatedHours}h</span>}
            </div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{task.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg border p-2 transition-all ml-4 flex-shrink-0"
            style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Description */}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Description</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{task.description || 'No description provided.'}</p>
          </div>

          {/* Assigned to */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Assigned To</p>
            <div className="flex items-center gap-2">
              <UserRound size={16} style={{ color: 'var(--purple-bright)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{personName(task.assignedTo)}</span>
            </div>
            {task.assignedTo?.department && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{task.assignedTo.department}</p>}
          </div>

          {/* Assigned by */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Assigned By</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{personName(task.assignedBy)}</p>
          </div>

          {/* Deadline */}
          {task.deadline && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Deadline</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{new Date(task.deadline).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          )}

          {/* Estimated hours */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Estimated Time</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{task.estimatedHours || 1} hour{(task.estimatedHours || 1) !== 1 ? 's' : ''}</p>
          </div>

          {/* Time slot */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Time Slot</p>
            <div className="flex items-center gap-2">
              <Clock3 size={14} style={{ color: 'var(--purple-bright)' }} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Slot #{task.currentHour + 1}</span>
            </div>
          </div>

          {/* Proof */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Proof / Attachments</p>
            {task.proofUrl ? (
              <a href={task.proofUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all hover:bg-[rgba(168,85,247,0.06)]"
                style={{ borderColor: 'var(--glass-border)', color: 'var(--purple-bright)' }}>
                <FileIcon size={14} /> View uploaded proof <ExternalLink size={12} />
              </a>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{task.requiresProof ? 'Proof required - not yet uploaded' : 'No proof required'}</p>
            )}
          </div>

          {/* Checklist */}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Progress Checklist</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'checklistReviewed', label: 'Reviewed', done: task.checklistReviewed },
                { key: 'checklistRequirementsRecieved', label: 'Requirements', done: task.checklistRequirementsRecieved },
                { key: 'checklistStarted', label: 'Started', done: task.checklistStarted },
                { key: 'checklistCompleted', label: 'Completed', done: task.checklistCompleted },
              ].map(item => (
                <div key={item.key} className={`rounded-lg border p-3 text-center transition-all ${item.done ? 'border-green-500/40 bg-green-500/5' : ''}`}
                  style={{ borderColor: item.done ? 'rgba(34,197,94,0.3)' : 'var(--glass-border)' }}>
                  {item.done ? <CheckCircle2 size={20} className="mx-auto mb-1" style={{ color: 'var(--status-done)' }} /> : <Square size={20} className="mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />}
                  <p className="text-xs font-medium" style={{ color: item.done ? 'var(--status-done)' : 'var(--text-muted)' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Activity History</p>
            {(task.activityLogs || []).length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {task.activityLogs?.map((log) => (
                  <div key={`${log.createdAt}-${log.fieldChanged}`} className="flex items-start gap-3 rounded-lg border p-2.5"
                    style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 30%, transparent)' }}>
                    <div className="h-2 w-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: 'var(--purple-bright)' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {personName(log.changedBy)} changed <span className="font-semibold">{log.fieldChanged ?? 'task'}</span>
                      </p>
                      {(log.oldValue || log.newValue) && (
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {log.oldValue ?? '(none)'} → {log.newValue ?? '(none)'}
                        </p>
                      )}
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [shift, setShift] = useState({ start: '09:00', end: '18:00' });
  const [role, setRole] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskWithRelations | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  // Local checklist state for optimistic updates: taskId -> Partial<{checklistReviewed, checklistRequirementsRecieved, checklistStarted, checklistCompleted}>
  const [checklistUpdates, setChecklistUpdates] = useState<Record<string, Partial<Record<string, boolean>>>>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState<string | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<(typeof viewModes)[number]>('Table');
  const [plannerMode, setPlannerMode] = useState<(typeof plannerModes)[number]>('Day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [optimizing, setOptimizing] = useState(false);
  const [filters, setFilters] = useState({ employee: 'ALL', status: 'ALL', priority: 'ALL', approval: 'ALL', proof: 'ALL', date: '' });
  const [editForm, setEditForm] = useState({ title: '', description: '', priority: 'MEDIUM', status: 'ACTIVE', estimatedHours: 1, requiresProof: true, assignedToId: '' });
  const [createForm, setCreateForm] = useState({
    title: '', description: '', priority: 'MEDIUM', assignedToId: '', date: new Date().toISOString().slice(0, 10),
    estimatedHours: 1, requiresProof: true, approvalRequired: false, recurring: false
  });

  const currentHour = getCurrentHour(shift.start, shift.end);
  const shiftSlots = getShiftSlots(shift.start, shift.end);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    setLoading(true);
    const response = await fetch('/api/tasks');
    if (response.ok) {
      const data = await response.json();
      const ns = data.shift ?? { start: '09:00', end: '18:00' };
      setShift(ns); setRole(data.role);
      const normalized = (data.tasks || []).map(normalizeTask);
      setTasks(processTasksForUser(normalized, getCurrentHour(ns.start, ns.end)) as TaskWithRelations[]);
      if (data.role === 'ADMIN') {
        const ur = await fetch('/api/users');
        if (ur.ok) { const ud = await ur.json(); setEmployees(ud.users || []); }
      }
    }
    setLoading(false);
  };

  const formatHour = (hourIndex: number) => {
    const start = Number(shift.start.split(':')[0] ?? 9);
    const hour = start + hourIndex;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:00 ${suffix}`;
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const hs = `${task.title} ${task.description} ${personName(task.assignedTo)} ${personName(task.assignedBy)}`.toLowerCase();
      if (search && !hs.includes(search.toLowerCase())) return false;
      if (filters.employee !== 'ALL' && task.assignedTo?.id !== filters.employee) return false;
      if (filters.status !== 'ALL' && task.status !== filters.status) return false;
      if (filters.priority !== 'ALL' && task.priority !== filters.priority) return false;
      if (filters.approval === 'PENDING' && task.status !== 'WAITING_APPROVAL') return false;
      if (filters.approval === 'APPROVED' && !['APPROVED', 'COMPLETED'].includes(task.status)) return false;
      if (filters.proof === 'REQUIRED' && !task.requiresProof) return false;
      if (filters.proof === 'UPLOADED' && !task.proofUrl) return false;
      if (filters.proof === 'MISSING' && (!task.requiresProof || task.proofUrl)) return false;
      return true;
    });
  }, [filters, search, tasks]);

  const stats = useMemo(() => ({
    active: tasks.filter(t => t.status === 'ACTIVE').length,
    approval: tasks.filter(t => t.status === 'WAITING_APPROVAL').length,
    locked: tasks.filter(t => t.status === 'LOCKED').length,
    complete: tasks.filter(t => ['APPROVED', 'COMPLETED'].includes(t.status)).length
  }), [tasks]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const monthGrid = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const tasksForDate = useMemo(() => getTasksForDate(tasks, selectedDate), [tasks, selectedDate]);

  const openEdit = (task: TaskWithRelations) => {
    setEditingTask(task);
    setEditForm({ title: task.title, description: task.description, priority: task.priority, status: task.status, estimatedHours: task.estimatedHours || 1, requiresProof: task.requiresProof, assignedToId: task.assignedTo?.id ?? '' });
  };

  const patchTask = async (taskId: string, payload: Record<string, unknown>, reload = true) => {
    const r = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error((await r.json()).error || 'Task update failed');
    if (reload) await loadTasks();
  };

  const saveEdit = async () => { if (!editingTask) return; await patchTask(editingTask.id, editForm); setEditingTask(null); };

  const createTask = async (draft = false) => {
    if (draft) { setMessage('Draft saved locally for this session.'); setNewTaskOpen(false); return; }
    const r = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: createForm.title,
        description: createForm.description,
        priority: createForm.priority,
        estimatedHours: Number(createForm.estimatedHours),
        requiresProof: createForm.requiresProof,
        assignedToId: createForm.assignedToId || undefined,
        date: createForm.date
      })
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) {
      setMessage(d?.error || d?.message || 'Unable to create task');
      return;
    }
    setMessage(d.queuedForAcceptance ? 'Task request queued for acceptance.' : 'Task created and planner updated.');
    setNewTaskOpen(false); setCreateForm(f => ({ ...f, title: '', description: '' })); await loadTasks();
  };

  const duplicateTask = async (task: TaskWithRelations) => {
    const r = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `${task.title} copy`, description: task.description, priority: task.priority, estimatedHours: task.estimatedHours || 1, requiresProof: task.requiresProof, assignedToId: task.assignedTo?.id }) });
    if (r.ok) await loadTasks();
  };

  const optimizeSchedule = async () => {
    setOptimizing(true);
    try {
      const processed = processTasksForUser(tasks, currentHour);
      const slots = autoScheduleTasks(processed, shiftSlots);
      const updatedTasks = tasks.map((task) => {
        const scheduled = slots.find((slot) => slot.taskId === task.id);
        return scheduled ? { ...task, currentHour: scheduled.hour } : task;
      });
      setTasks(processTasksForUser(updatedTasks, currentHour) as TaskWithRelations[]);
      await Promise.all(slots.map((slot) => patchTask(slot.taskId, { currentHour: slot.hour }, false)));
      await loadTasks();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Auto schedule failed');
    } finally {
      setOptimizing(false);
    }
  };

  const deleteTask = async (task: TaskWithRelations) => { const r = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }); if (r.ok) { setActionsOpen(null); await loadTasks(); } };
  const canDragTask = (task: TaskWithRelations) => {
    if (role === 'ADMIN') return true;
    if (task.status === 'LOCKED') return false;
    if (['APPROVED', 'COMPLETED'].includes(task.status)) return false;
    return task.canAccess;
  };

  /** Toggle a checklist item - optimistic update, no full page refresh */
  const toggleChecklist = async (taskId: string, field: string, value: boolean) => {
    // Optimistic local update
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, [field]: value } as TaskWithRelations : t
    ));
    try {
      await patchTask(taskId, { [field]: value }, false);
    } catch (e) {
      // Revert on failure
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, [field]: !value } as TaskWithRelations : t
      ));
      setMessage(e instanceof Error ? e.message : 'Checklist update failed');
    }
  };

  /** Update status with notification to admin */
  const updateStatus = async (taskId: string, status: string) => {
    try {
      await patchTask(taskId, { status }, true);
      setMessage(`Status updated to ${status}. Admin has been notified.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Status update failed');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const taskId = String(event.active.id);
    const target = event.over?.data.current;
    if (!target) return;
    const task = tasks.find(i => i.id === taskId);
    if (!task || !canDragTask(task)) return;

    const payload: Record<string, unknown> = {};
    let nextTask: TaskWithRelations | null = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (typeof target.hour === 'number') {
      if (task.currentHour >= target.hour) return;
      payload.currentHour = target.hour;
      nextTask = { ...task, currentHour: target.hour };
    }

    if (typeof target.date === 'string') {
      const newDeadline = new Date(target.date);
      if (Number.isNaN(newDeadline.getTime())) return;
      const targetDate = new Date(newDeadline);
      targetDate.setHours(0, 0, 0, 0);
      if (targetDate.getTime() < today.getTime()) return;
      if (task.deadline) {
        const currentDeadline = new Date(task.deadline);
        currentDeadline.setHours(0, 0, 0, 0);
        if (targetDate.getTime() < currentDeadline.getTime()) return;
      }
      payload.deadline = target.date;
      nextTask = { ...task, deadline: newDeadline };
    }

    if (Object.keys(payload).length === 0) return;

    const prev = tasks;
    const updatedTasks = tasks.map((t) => (t.id === taskId && nextTask ? nextTask : t));
    setTasks(processTasksForUser(updatedTasks, currentHour) as TaskWithRelations[]);

    try {
      await patchTask(taskId, payload, false);
      await loadTasks();
    } catch (e) {
      setTasks(prev);
      setMessage(e instanceof Error ? e.message : 'Planner update failed');
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="relative"><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--purple-bright)' }} /><div className="absolute inset-0 animate-ping opacity-20"><Loader2 className="h-8 w-8" style={{ color: 'var(--purple-bright)' }} /></div></div>
      </main>
    );
  }

  return (
    <main className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(360px,3fr)]">
        <div className="min-w-0 space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-3" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                <Sparkles size={14} /> Task Operations
              </div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Task Operations</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Manage execution, approvals, scheduling, and workflow progression.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setNewTaskOpen(true)} className="glass-button inline-flex items-center gap-2"><Plus size={16} /> New Task</button>
              {/* Filter button - always visible, but for non-admin it shows a simpler inline filter */}
              <button onClick={() => setShowFilters(v => !v)} className="glass-button-outline inline-flex items-center gap-2"><Filter size={16} /> Filter</button>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks"
                  className="w-48 rounded-xl border px-3 py-2.5 pl-9 text-sm outline-none transition-all"
                  style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
              </div>
              <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)' }}>
                {viewModes.map((mode) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      viewMode === mode ? 'glass-button text-white px-3 py-1.5 text-xs' : ''
                    }`}
                    style={viewMode !== mode ? { color: 'var(--text-muted)' } : {}}>{mode}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Employee-only filter column - visible next to heading for non-admin */}
          {role !== 'ADMIN' && showFilters && (
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border"
              style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 40%, transparent)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Quick Filter:</span>
              <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                className="rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                <option value="ALL" style={{ backgroundColor: 'var(--bg-secondary)' }}>All status</option>
                <option value="ACTIVE" style={{ backgroundColor: 'var(--bg-secondary)' }}>Active</option>
                <option value="COMPLETED" style={{ backgroundColor: 'var(--bg-secondary)' }}>Completed</option>
                <option value="LOCKED" style={{ backgroundColor: 'var(--bg-secondary)' }}>Not Started</option>
              </select>
              <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
                className="rounded-lg border px-2.5 py-1.5 text-xs outline-none"
                style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                <option value="ALL" style={{ backgroundColor: 'var(--bg-secondary)' }}>All priority</option>
                {priorities.map(p => <option key={p} value={p} style={{ backgroundColor: 'var(--bg-secondary)' }}>{p}</option>)}
              </select>
            </div>
          )}

          {/* Admin full filter section */}
          <AnimatePresence>
            {showFilters && role === 'ADMIN' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid gap-3 rounded-2xl border p-3 md:grid-cols-3 xl:grid-cols-6" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 50%, transparent)' }}>
                  <select value={filters.employee} onChange={e => setFilters(f => ({ ...f, employee: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                    <option value="ALL" style={{ backgroundColor: 'var(--bg-secondary)' }}>All employees</option>
                    {employees.map(e => <option key={e.id} value={e.id} style={{ backgroundColor: 'var(--bg-secondary)' }}>{e.name ?? e.email}</option>)}
                  </select>
                  <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                    <option value="ALL" style={{ backgroundColor: 'var(--bg-secondary)' }}>All status</option>
                    {statuses.map(s => <option key={s} value={s} style={{ backgroundColor: 'var(--bg-secondary)' }}>{s}</option>)}
                  </select>
                  <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                    <option value="ALL" style={{ backgroundColor: 'var(--bg-secondary)' }}>All priority</option>
                    {priorities.map(p => <option key={p} value={p} style={{ backgroundColor: 'var(--bg-secondary)' }}>{p}</option>)}
                  </select>
                  <select value={filters.approval} onChange={e => setFilters(f => ({ ...f, approval: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                    <option value="ALL" style={{ backgroundColor: 'var(--bg-secondary)' }}>Any approval</option>
                    <option value="PENDING" style={{ backgroundColor: 'var(--bg-secondary)' }}>Pending</option>
                    <option value="APPROVED" style={{ backgroundColor: 'var(--bg-secondary)' }}>Approved</option>
                  </select>
                  <select value={filters.proof} onChange={e => setFilters(f => ({ ...f, proof: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                    <option value="ALL" style={{ backgroundColor: 'var(--bg-secondary)' }}>Any proof</option>
                    <option value="REQUIRED" style={{ backgroundColor: 'var(--bg-secondary)' }}>Required</option>
                    <option value="UPLOADED" style={{ backgroundColor: 'var(--bg-secondary)' }}>Uploaded</option>
                    <option value="MISSING" style={{ backgroundColor: 'var(--bg-secondary)' }}>Missing</option>
                  </select>
                  <input type="date" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
                    className="rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { label: 'Active', value: stats.active, color: 'var(--status-active)' },
              { label: 'Approvals', value: stats.approval, color: 'var(--status-pending)' },
              { label: 'Locked', value: stats.locked, color: '#7C3AED' },
              { label: 'Complete', value: stats.complete, color: 'var(--status-done)' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 50%, transparent)' }}>
                <p className="font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {message && <div className="rounded-xl border px-4 py-3 text-sm font-medium" style={{ borderColor: 'color-mix(in srgb, var(--purple-bright) 30%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 10%, transparent)', color: 'var(--purple-bright)' }}>{message}</div>}

          {filteredTasks.length === 0 ? (
            <section className="glass-panel p-12 text-center">
              <LayoutGrid className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--purple-bright)' }} />
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>No scheduled tasks</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Create your first task to start building the execution plan.</p>
              <button onClick={() => setNewTaskOpen(true)} className="mt-5 glass-button">Create your first task</button>
            </section>
          ) : viewMode === 'Table' ? (
            <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
              <table className="min-w-[1120px] w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.14em]" style={{ backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-muted)' }}>
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Task title</th>
                    <th className="px-3 py-3">Assigned to</th>
                    <th className="px-3 py-3">Priority</th>
                    <th className="px-3 py-3">Time slot</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Approval</th>
                    <th className="px-3 py-3">Proof</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
                  {filteredTasks.map((task, index) => {
                    const checklistComplete = task.checklistReviewed && task.checklistRequirementsRecieved && task.checklistStarted && task.checklistCompleted;
                    const isExpanded = expandedTask === `checklist-${task.id}`;
                    return (
                    <React.Fragment key={task.id}>
                    <tr
                      className={`align-top transition-all hover:bg-[rgba(168,85,247,0.03)] ${checklistComplete ? 'bg-green-500/5' : ''}`}
                      style={{
                        backgroundColor: checklistComplete ? 'rgba(34,197,94,0.04)' : 'transparent',
                        borderLeft: checklistComplete ? '3px solid rgb(34,197,94)' : '3px solid transparent'
                      }}>
                      <td className="px-3 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{index + 1}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                        <p className="line-clamp-1 text-xs" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{personName(task.assignedTo)}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 60%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>{task.priority}</span>
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{formatHour(task.currentHour)}</td>
                      <td className="px-3 py-3">
                        <select
                          value={task.status}
                          onChange={(e) => updateStatus(task.id, e.target.value)}
                          className="rounded-lg border px-2 py-1 text-xs outline-none font-medium"
                          style={{
                            borderColor: task.status === 'COMPLETED' ? 'rgba(34,197,94,0.4)' : task.status === 'ACTIVE' ? 'rgba(59,130,246,0.4)' : 'var(--glass-border)',
                            backgroundColor: task.status === 'COMPLETED' ? 'rgba(34,197,94,0.08)' : task.status === 'ACTIVE' ? 'rgba(59,130,246,0.08)' : 'color-mix(in srgb, var(--panel-bg) 60%, transparent)',
                            color: task.status === 'COMPLETED' ? 'rgb(34,197,94)' : task.status === 'ACTIVE' ? 'rgb(59,130,246)' : 'var(--text-primary)'
                          }}
                        >
                          <option value="LOCKED" style={{ backgroundColor: 'var(--bg-secondary)' }}>Not Started</option>
                          <option value="ACTIVE" style={{ backgroundColor: 'var(--bg-secondary)' }}>Active</option>
                          <option value="COMPLETED" style={{ backgroundColor: 'var(--bg-secondary)' }}>Completed</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{task.status === 'WAITING_APPROVAL' ? 'Pending' : ['APPROVED', 'COMPLETED'].includes(task.status) ? 'Approved' : 'Not sent'}</td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{task.proofUrl ? 'Uploaded' : task.requiresProof ? 'Required' : 'Optional'}</td>
                      <td className="relative px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedTask(isExpanded ? null : `checklist-${task.id}`)}
                            className="rounded-lg border p-1.5 transition-all"
                            style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: isExpanded ? 'var(--purple-bright)' : 'var(--text-muted)' }}
                            title="Toggle checklist"
                          >
                            <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          <ActionMenu task={task} open={actionsOpen === task.id} setOpen={setActionsOpen} onOpen={() => setViewingTask(task)} onEdit={() => openEdit(task)} onDuplicate={() => duplicateTask(task)} onProof={() => setSelectedTask(task)} onDelete={() => deleteTask(task)} />
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`checklist-row-${task.id}`} className="bg-[rgba(168,85,247,0.02)]">
                        <td colSpan={11} className="px-3 py-3">
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border p-4"
                            style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)' }}>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Progress Checklist</p>
                              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                Est. {task.estimatedHours || 1}h — {task.priority}
                              </span>
                            </div>
                            <ChecklistDisplay task={task} onToggle={(f, v) => toggleChecklist(task.id, f, v)} />
                          </motion.div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );})}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`grid gap-3 ${viewMode === 'Kanban' ? 'lg:grid-cols-3' : ''}`}>
              {(viewMode === 'Kanban' ? ['ACTIVE', 'WAITING_APPROVAL', 'LOCKED'] : ['ALL']).map((group) => (
                <div key={group} className="glass-panel-light p-3">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--purple-bright)' }}>{group === 'ALL' ? 'Compact queue' : group}</p>
                  <div className="space-y-2">
                    {filteredTasks.filter((t) => group === 'ALL' || t.status === group).map((task) => (
                      <button key={task.id} onClick={() => setViewingTask(task)}
                        className="w-full rounded-xl border p-3 text-left transition-all hover:border-[rgba(168,85,247,0.15)]"
                        style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 50%, transparent)' }}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatHour(task.currentHour)}</span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{personName(task.assignedTo)} - {task.priority}</p>
                        <div className="mt-2"><ChecklistDisplay task={task} onToggle={(f, v) => toggleChecklist(task.id, f, v)} compact /></div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit glass-panel p-4 xl:sticky xl:top-24">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-2" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 80%, transparent)', backgroundColor: 'color-mix(in srgb, var(--purple-bright) 8%, transparent)', color: 'var(--purple-bright)' }}>
                <CalendarDays size={14} /> Planner
              </div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Execution Planner</h2>
            </div>
            <div className="flex rounded-xl border p-1" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)' }}>
              {plannerModes.map((mode) => (
                <button key={mode} onClick={() => setPlannerMode(mode)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    plannerMode === mode ? 'glass-button text-white px-2.5 py-1.5 text-xs' : ''
                  }`}
                  style={plannerMode !== mode ? { color: 'var(--text-muted)' } : {}}>{mode}</button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button onClick={optimizeSchedule} disabled={optimizing} className="glass-button inline-flex items-center gap-2 text-xs">
              {optimizing ? 'Optimizing...' : 'Optimize Schedule'}
            </button>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Optimizes with priorities + est. hours.</p>
          </div>

          <DndContext onDragEnd={handleDragEnd}>
            {plannerMode === 'Day' && (
              <div className="mt-4 space-y-2 pr-1">
                {shiftSlots.map((slot) => (
                  <PlannerSlot key={slot} hour={slot} label={formatHour(slot)} current={slot === currentHour}>
                    {filteredTasks.filter((t) => t.currentHour === slot).map((task) => (
                      <DraggableTaskBlock key={task.id} task={task} disabled={!canDragTask(task)} />
                    ))}
                    {filteredTasks.filter((t) => t.currentHour === slot).length === 0 && (
                      <p className="rounded-lg border border-dashed p-2 text-xs" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', color: 'var(--text-muted)' }}>Open execution slot</p>
                    )}
                  </PlannerSlot>
                ))}
              </div>
            )}
            {plannerMode === 'Week' && (
              <div className="mt-4 grid grid-cols-7 gap-2">
                {weekDates.map((date) => {
                  const dayTasks = filteredTasks.filter((task) => task.deadline && getTasksForDate([task], date).length > 0);
                  const dayLabel = date.toLocaleDateString(undefined, { weekday: 'short' });
                  const dayNumber = date.getDate();
                  const isToday = date.toDateString() === new Date().toDateString();

                  return (
                    <PlannerDateZone key={date.toISOString()} date={date} selected={isToday}>
                      <div className="mb-2 flex items-center justify-between text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                        <span>{dayLabel}</span>
                        <span>{dayNumber}</span>
                      </div>
                      <div className="space-y-2">
                        {dayTasks.length > 0 ? dayTasks.slice(0, 6).map((task) => <DraggableTaskBlock key={task.id} task={task} disabled={!canDragTask(task)} />) : (
                          <div className="rounded-xl border border-dashed p-3 text-center text-[11px]" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 40%, transparent)', color: 'var(--text-muted)' }}>
                            No tasks due
                          </div>
                        )}
                      </div>
                    </PlannerDateZone>
                  );
                })}
              </div>
            )}
            {plannerMode === 'Month' && (
              <div className="mt-4">
                <div className="grid grid-cols-7 gap-2">
                  {monthGrid.map((date) => {
                    const dayTasks = filteredTasks.filter((task) => task.deadline && getTasksForDate([task], date).length > 0);
                    const dayCount = dayTasks.length;
                    const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    return (
                      <PlannerDateZone key={date.toISOString()} date={date} selected={isSelected} compact>
                        <button type="button" onClick={() => setSelectedDate(date)} className="w-full text-left">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold" style={{ color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)' }}>{date.getDate()}</p>
                            {dayCount > 0 && <span className="rounded-full bg-[rgba(168,85,247,0.12)] px-2 py-0.5 text-[10px] font-semibold" style={{ color: 'var(--purple-bright)' }}>{dayCount}</span>}
                          </div>
                          <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{dayCount > 0 ? `${dayCount} task${dayCount === 1 ? '' : 's'}` : 'No tasks'}</p>
                        </button>
                      </PlannerDateZone>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 50%, transparent)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Tasks for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tasksForDate.length} scheduled task{tasksForDate.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  {tasksForDate.length === 0 ? (
                    <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>No tasks scheduled for this date. Drag a task here to assign it.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {tasksForDate.map((task) => (
                        <div key={task.id} className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)' }}>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.priority} • {task.status}</p>
                          <div className="mt-1"><ChecklistDisplay task={task} onToggle={(f, v) => toggleChecklist(task.id, f, v)} compact /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DndContext>
        </aside>
      </section>

      {/* Detail modal for "Open" action */}
      {viewingTask && <TaskDetailModal task={viewingTask} onClose={() => setViewingTask(null)} />}

      {/* Proof upload */}
      {selectedTask && <ProofUpload task={selectedTask} onClose={() => setSelectedTask(null)} onUploadSuccess={loadTasks} />}

      {/* Edit modal */}
      {editingTask && <TaskModal title="Edit Task" employees={employees} role={role} form={editForm} setForm={setEditForm} onClose={() => setEditingTask(null)} onPrimary={saveEdit} primaryLabel="Save changes" secondaryLabel="Cancel" />}

      {/* Create modal */}
      {newTaskOpen && <TaskModal title="Create New Task" create employees={employees} role={role} form={createForm} setForm={setCreateForm} onClose={() => setNewTaskOpen(false)} onPrimary={() => createTask(false)} onSecondary={() => createTask(true)} primaryLabel="Create Task" secondaryLabel="Save Draft" />}
    </main>
  );
}

function ActionMenu({ task, open, setOpen, onOpen, onEdit, onDuplicate, onProof, onDelete }: { task: TaskWithRelations; open: boolean; setOpen: (id: string | null) => void; onOpen: () => void; onEdit: () => void; onDuplicate: () => void; onProof: () => void; onDelete: () => void }) {
  const actions = [
    { label: 'Open', icon: FileText, action: onOpen },
    { label: 'Edit', icon: Edit3, action: onEdit },
    { label: 'Duplicate', icon: Copy, action: onDuplicate },
    { label: 'Upload proof', icon: Upload, action: onProof },
    { label: 'Delete', icon: Trash2, action: onDelete, danger: true }
  ];

  return (
    <div className="relative">
      <button onClick={() => setOpen(open ? null : task.id)} className="rounded-xl border p-2 transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: 'var(--text-muted)' }}><MoreVertical size={16} /></button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border p-1 shadow-lg backdrop-blur-xl" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 95%, transparent)' }}>
          {actions.map((item) => {
            const Icon = item.icon;
            return <button key={item.label} onClick={() => { item.action(); setOpen(null); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all hover:bg-[rgba(168,85,247,0.06)]`} style={{ color: item.danger ? '#FF4D9D' : 'var(--text-secondary)' }}><Icon size={14} /> {item.label}</button>;
          })}
        </div>
      )}
    </div>
  );
}

function TaskModal({ title, create, employees, role, form, setForm, onClose, onPrimary, onSecondary, primaryLabel, secondaryLabel }: { title: string; create?: boolean; employees: EmployeeOption[]; role?: string; form: any; setForm: React.Dispatch<React.SetStateAction<any>>; onClose: () => void; onPrimary: () => void; onSecondary?: () => void; primaryLabel: string; secondaryLabel: string }) {
  const hours = Math.floor(form.estimatedHours || 0);
  const mins = Math.round(((form.estimatedHours || 0) - hours) * 60);

  const setHoursMins = (h: number, m: number) => {
    const val = Math.max(0.25, Math.min(24, h + m / 60));
    setForm((c: any) => ({ ...c, estimatedHours: val }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ y: 18, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, scale: 0.97 }}
        className="relative w-full max-w-2xl rounded-2xl glass-panel p-5" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'color-mix(in srgb, var(--panel-bg) 96%, transparent)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--purple-bright)' }}>{create ? 'Planner intake' : 'Workflow control'}</p>
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg border p-2 transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--card-bg) 60%, transparent)', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div className="mt-5 grid gap-3">
          <input value={form.title} onChange={(e) => setForm((c: any) => ({ ...c, title: e.target.value }))} placeholder="Task name"
            className="rounded-xl border px-4 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
          <textarea value={form.description} onChange={(e) => setForm((c: any) => ({ ...c, description: e.target.value }))} rows={4} placeholder="Description"
            className="rounded-xl border px-4 py-3 text-sm outline-none transition-all" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={form.priority} onChange={(e) => setForm((c: any) => ({ ...c, priority: e.target.value }))}
              className="rounded-xl border px-3 py-3 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
              {priorities.map(p => <option key={p} value={p} style={{ backgroundColor: 'var(--bg-secondary)' }}>{p}</option>)}
            </select>
            <select value={form.assignedToId} onChange={(e) => setForm((c: any) => ({ ...c, assignedToId: e.target.value }))}
              className="rounded-xl border px-3 py-3 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
              <option value="" style={{ backgroundColor: 'var(--bg-secondary)' }}>{role === 'ADMIN' ? 'Assign employee' : 'Assign to myself'}</option>
              {employees.map(e => <option key={e.id} value={e.id} style={{ backgroundColor: 'var(--bg-secondary)' }}>{e.name ?? e.email}</option>)}
            </select>
            <input type="date" value={form.date ?? new Date().toISOString().slice(0, 10)} onChange={(e) => setForm((c: any) => ({ ...c, date: e.target.value }))}
              className="rounded-xl border px-3 py-3 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }} />
          </div>

          {/* Hours / Minutes input replacing the old hour slot */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Estimated time to complete</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={hours}
                    onChange={(e) => setHoursMins(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)), mins)}
                    className="w-16 rounded-lg border px-2.5 py-2 text-sm text-center outline-none"
                    style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}
                  />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>hrs</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={mins}
                    step={5}
                    onChange={(e) => setHoursMins(hours, Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-16 rounded-lg border px-2.5 py-2 text-sm text-center outline-none"
                    style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}
                  />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>min</span>
                </div>
              </div>
            </div>

            {!create && (
              <select value={form.status} onChange={(e) => setForm((c: any) => ({ ...c, status: e.target.value }))}
                className="rounded-xl border px-3 py-3 text-sm outline-none" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-primary)' }}>
                {statuses.map(s => <option key={s} value={s} style={{ backgroundColor: 'var(--bg-secondary)' }}>{s}</option>)}
              </select>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Requires proof', key: 'requiresProof' },
              ...(create
                ? [
                    { label: 'Approval required', key: 'approvalRequired' },
                    { label: 'Recurring task', key: 'recurring' },
                  ]
                : [])
            ].map(cb => (
              <label key={cb.key} className="flex items-center gap-2 rounded-xl border px-3 py-3 text-sm cursor-pointer transition-all"
                style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 60%, transparent)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)' }}>
                <input type="checkbox" checked={form[cb.key] ?? false} onChange={(e) => setForm((c: any) => ({ ...c, [cb.key]: e.target.checked }))} className="accent-[#A855F7]" />
                <span style={{ color: 'var(--text-secondary)' }}>{cb.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onSecondary ?? onClose} className="glass-button-outline flex-1">{secondaryLabel}</button>
          <button onClick={onPrimary} className="glass-button flex-1">{primaryLabel}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}