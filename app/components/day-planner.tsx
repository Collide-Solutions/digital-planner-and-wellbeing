'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { CalendarDays, Clock, Plus, Lock, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { processTasksForUser, getCurrentHour, getShiftSlots, parseShiftHour, ProcessedTask } from '@/lib/task-engine';

interface DayPlannerProps {
  onTaskSelect?: (task: ProcessedTask) => void;
}

export function DayPlanner({ onTaskSelect }: DayPlannerProps) {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<ProcessedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');

  const currentHour = getCurrentHour(shiftStart, shiftEnd);
  const shiftHours = getShiftSlots(shiftStart, shiftEnd);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setShiftStart(data.shift?.start ?? '09:00');
      setShiftEnd(data.shift?.end ?? '18:00');
      const normalizedTasks = (data.tasks || []).map((task: any) => ({
        ...task,
        deadline: task.deadline ? new Date(task.deadline) : null,
      }));
      const processedTasks = processTasksForUser(normalizedTasks, getCurrentHour(data.shift?.start, data.shift?.end));
      setTasks(processedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getTaskForHour = (hour: number): ProcessedTask | null => {
    return tasks.find(task => task.currentHour === hour) || null;
  };

  const getHourStatus = (hour: number) => {
    const task = getTaskForHour(hour);
    const isCurrent = hour === currentHour;
    const isPast = hour < currentHour;
    const isFuture = hour > currentHour;

    if (isCurrent) return 'current';
    if (isPast) return 'past';
    if (isFuture) return 'future';
    return 'upcoming';
  };

  const formatHour = (hour: number) => {
    const displayHour = parseShiftHour(shiftStart) + hour;
    return displayHour > 12 ? `${displayHour - 12} PM` : displayHour === 12 ? '12 PM' : `${displayHour} AM`;
  };

  const handleTaskClick = (task: ProcessedTask) => {
    if (task.canAccess && onTaskSelect) {
      onTaskSelect(task);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-glow">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-slate-400 dark:text-slate-300">Loading day planner...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-glow">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Day Planner</h2>
          <p className="text-sm text-slate-400 dark:text-slate-300">Complete workday timeline with hourly execution</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 dark:text-slate-200">
          <CalendarDays size={16} />
          <span>Shift: {shiftStart} - {shiftEnd}</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {shiftHours.map((hourIndex) => {
          const task = getTaskForHour(hourIndex);
          const status = getHourStatus(hourIndex);
          const isCurrent = status === 'current';
          const isPast = status === 'past';
          const isFuture = status === 'future';

          return (
            <motion.div
              key={hourIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: hourIndex * 0.05 }}
              className={`group relative rounded-2xl border p-4 transition-all duration-200 ${
                isCurrent
                  ? 'border-violet-400/30 bg-violet-400/10 shadow-lg shadow-violet-400/10'
                  : isPast
                  ? 'border-violet-400/20 bg-violet-400/5'
                  : isFuture
                  ? 'border-white/10 bg-slate-950/50'
                  : 'border-white/10 bg-slate-950/70'
              } ${task?.canAccess ? 'cursor-pointer hover:border-violet-400/20' : 'cursor-not-allowed'}`}
              onClick={() => task && handleTaskClick(task)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isCurrent
                      ? 'bg-violet-400 text-slate-950'
                      : isPast
                      ? 'bg-violet-400/20 text-violet-300'
                      : 'bg-white/10 text-slate-400'
                  }`}>
                    {isCurrent ? (
                      <Play size={14} />
                    ) : isPast ? (
                      <CheckCircle size={14} />
                    ) : task ? (
                      <Clock size={14} />
                    ) : (
                      <Plus size={14} />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      isCurrent ? 'text-white' : isPast ? 'text-violet-200' : 'text-slate-300'
                    }`}>
                      {formatHour(hourIndex)}
                    </p>
                    {task ? (
                      <p className={`text-xs ${
                        isCurrent ? 'text-violet-200' : isPast ? 'text-violet-300/70' : 'text-slate-400'
                      }`}>
                        {task.title}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">No task assigned</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {task && (
                    <>
                      {task.isLocked && (
                        <Lock size={14} className="text-slate-500" />
                      )}
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        task.displayStatus === 'COMPLETED'
                          ? 'bg-violet-500/15 text-violet-300'
                          : task.displayStatus === 'ACTIVE'
                          ? 'bg-violet-500/15 text-violet-300'
                          : task.displayStatus === 'PENDING_APPROVAL'
                          ? 'bg-orange-500/15 text-orange-300'
                          : task.displayStatus === 'REJECTED'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-slate-500/15 text-slate-400'
                      }`}>
                        {task.displayStatus === 'PENDING_APPROVAL' ? 'PENDING' : task.displayStatus}
                      </span>
                    </>
                  )}
                  {!task && isFuture && (
                    <span className="rounded-full bg-slate-500/15 px-2 py-1 text-xs text-slate-400">
                      EMPTY
                    </span>
                  )}
                </div>
              </div>

              {isCurrent && (
                <div className="mt-3 rounded-lg bg-violet-400/10 p-3">
                  <p className="text-xs text-violet-200">
                    Current hour - {task ? 'Complete and submit for approval' : 'Awaiting task assignment'}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl bg-slate-900/50 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <AlertCircle size={16} />
          <span>Tasks unlock sequentially after admin approval</span>
        </div>
      </div>
    </div>
  );
}

