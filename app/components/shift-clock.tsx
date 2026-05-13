'use client';

import { useState, useEffect } from 'react';
import { Clock3, CalendarDays } from 'lucide-react';

interface ShiftClockProps {
  shiftStart?: string;
  shiftEnd?: string;
}

export function ShiftClock({ shiftStart = '09:00', shiftEnd = '18:00' }: ShiftClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const calculateShiftProgress = () => {
    const now = currentTime;
    const [startHour, startMin] = shiftStart.split(':').map(Number);
    const [endHour, endMin] = shiftEnd.split(':').map(Number);

    const shiftStartTime = new Date(now);
    shiftStartTime.setHours(startHour, startMin, 0, 0);

    const shiftEndTime = new Date(now);
    shiftEndTime.setHours(endHour, endMin, 0, 0);

    const totalShiftMs = shiftEndTime.getTime() - shiftStartTime.getTime();
    const elapsedMs = now.getTime() - shiftStartTime.getTime();

    if (elapsedMs < 0) return { progress: 0, status: 'Not started', remaining: '0h logged', logged: '0h 0m', overtime: false };
    if (elapsedMs > totalShiftMs) {
      const overtimeMs = elapsedMs - totalShiftMs;
      const overtimeHours = Math.floor(overtimeMs / (1000 * 60 * 60));
      const overtimeMinutes = Math.floor((overtimeMs % (1000 * 60 * 60)) / (1000 * 60));
      return { progress: 100, status: 'Overtime', remaining: `${overtimeHours}h ${overtimeMinutes}m over`, logged: formatDuration(elapsedMs), overtime: true };
    }

    const progress = Math.min((elapsedMs / totalShiftMs) * 100, 100);
    const remainingMs = totalShiftMs - elapsedMs;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      progress,
      status: 'Active',
      remaining: `${remainingHours}h ${remainingMinutes}m remaining`,
      logged: formatDuration(elapsedMs),
      overtime: false
    };
  };

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const shiftData = calculateShiftProgress();

  return (
    <div className="hidden items-center gap-4 xl:flex">
      <div className="flex items-center gap-3">
        <Clock3 size={18} className="text-violet-700" />
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{formatTime(currentTime)}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Current time</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <CalendarDays size={18} className="text-violet-700" />
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">
            {shiftStart} - {shiftEnd}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Shift hours</p>
        </div>
      </div>

      <div className="flex min-w-36 flex-col gap-1 rounded-lg bg-white/20 px-3 py-2">
        <p className="text-sm font-semibold text-slate-950 dark:text-white">{shiftData.status}</p>
        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-400/50">
          <div
            className="h-full bg-gradient-to-r from-violet-700 to-violet-400 rounded-full transition-all duration-1000"
            style={{ width: `${shiftData.progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">{shiftData.remaining}</p>
      </div>

    </div>
  );
}
