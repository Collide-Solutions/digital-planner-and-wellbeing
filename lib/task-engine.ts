import { Task, TaskPriority, TaskStatus } from '@prisma/client';

export interface ProcessedTask extends Task {
  isLocked: boolean;
  isCurrent: boolean;
  canAccess: boolean;
  displayStatus: 'LOCKED' | 'ACTIVE' | 'COMPLETED' | 'PENDING_APPROVAL' | 'REJECTED';
  // Smart sort fields
  sortScore: number;
  isOverdue: boolean;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  deadlineProximity: 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'future' | 'none';
}

// Priority weights for sorting
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// Deadline proximity weights
const DEADLINE_WEIGHT = {
  overdue: 1000,
  today: 500,
  tomorrow: 250,
  this_week: 100,
  future: 50,
  none: 0,
};

// Approval urgency boost
const APPROVAL_BOOST = 75;

export function parseShiftHour(value?: string | null, fallback = 9): number {
  if (!value) return fallback;
  const [hour] = value.split(':').map(Number);
  return Number.isFinite(hour) ? hour : fallback;
}

export function getShiftSlots(shiftStart = '09:00', shiftEnd = '18:00'): number[] {
  const start = parseShiftHour(shiftStart, 9);
  const end = parseShiftHour(shiftEnd, 18);
  return Array.from({ length: Math.max(1, end - start) }, (_, index) => index);
}

export function getCurrentHour(shiftStart = '09:00', shiftEnd = '18:00'): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMinute = 0] = shiftStart.split(':').map(Number);
  const [endHour, endMinute = 0] = shiftEnd.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const currentShiftHour = Math.floor((currentMinutes - startMinutes) / 60);
  const maxHour = Math.max(0, Math.ceil((endMinutes - startMinutes) / 60) - 1);
  return Math.max(0, Math.min(maxHour, currentShiftHour));
}

function getDeadlineProximity(deadline: Date | string | null): ProcessedTask['deadlineProximity'] {
  if (!deadline) return 'none';
  const parsed = typeof deadline === 'string' ? new Date(deadline) : deadline;
  if (Number.isNaN(parsed.getTime())) return 'none';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays <= 7) return 'this_week';
  return 'future';
}

function getUrgencyLevel(dProximity: ProcessedTask['deadlineProximity'], priority: TaskPriority): ProcessedTask['urgencyLevel'] {
  if (dProximity === 'overdue') return 'critical';
  if (dProximity === 'today' && priority === 'CRITICAL') return 'critical';
  if (dProximity === 'today' || (dProximity === 'tomorrow' && priority === 'HIGH')) return 'high';
  if (priority === 'CRITICAL' || priority === 'HIGH') return 'high';
  if (priority === 'MEDIUM') return 'medium';
  return 'low';
}

function calculateSortScore(
  deadline: Date | null,
  priority: TaskPriority,
  status: TaskStatus,
  currentHour: number,
  taskHour: number
): number {
  const proximity = getDeadlineProximity(deadline);
  const deadlineScore = DEADLINE_WEIGHT[proximity];
  const priorityScore = PRIORITY_WEIGHT[priority] * 10;
  const approvalBoost = status === TaskStatus.WAITING_APPROVAL ? APPROVAL_BOOST : 0;

  // Hour alignment: tasks closer to current hour score higher
  const hourDelta = Math.abs(taskHour - currentHour);
  const hourScore = Math.max(0, 50 - hourDelta * 5);

  return deadlineScore + priorityScore + approvalBoost + hourScore;
}

export function processTasksForUser(tasks: Task[], currentHour: number): ProcessedTask[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // First, compute processed tasks with metadata
  const processed = tasks.map((task, index) => {
    const isLocked = task.status === TaskStatus.LOCKED;
    const isCurrent = task.currentHour === currentHour;
    const previousTask = index > 0 ? tasks[index - 1] : null;
    const previousComplete = previousTask ? isTerminalStatus(previousTask.status) : true;
    const isFuture = task.currentHour > currentHour;
    const canAccess = !isFuture && (!isLocked || previousComplete);
    const deadline = task.deadline || null;

    return {
      ...task,
      isLocked,
      isCurrent,
      canAccess,
      displayStatus: getDisplayStatus(task.status),
      sortScore: calculateSortScore(deadline, task.priority, task.status, currentHour, task.currentHour),
      isOverdue: deadline ? deadline.getTime() < today.getTime() : false,
      urgencyLevel: getUrgencyLevel(getDeadlineProximity(deadline), task.priority),
      deadlineProximity: getDeadlineProximity(deadline),
    } as ProcessedTask;
  });

  // Sort: descending by sortScore (highest urgency first)
  return processed.sort((a, b) => b.sortScore - a.sortScore);
}

export function canActivateTask(task: Task, previousTasks: Task[]): boolean {
  if (task.status !== TaskStatus.LOCKED) return false;
  const previousTask = previousTasks.find(t => t.currentHour === task.currentHour - 1);
  return !previousTask || isTerminalStatus(previousTask.status);
}

export function canSubmitTask(task: Task): boolean {
  return task.status === TaskStatus.ACTIVE;
}

export function canRequestApproval(task: Task): boolean {
  return task.status === TaskStatus.ACTIVE;
}

export function isTerminalStatus(status: TaskStatus): boolean {
  return status === TaskStatus.APPROVED || status === TaskStatus.COMPLETED;
}

export function getDisplayStatus(status: TaskStatus): ProcessedTask['displayStatus'] {
  if (status === TaskStatus.WAITING_APPROVAL) return 'PENDING_APPROVAL';
  if (status === TaskStatus.APPROVED || status === TaskStatus.COMPLETED) return 'COMPLETED';
  if (status === TaskStatus.REJECTED) return 'REJECTED';
  if (status === TaskStatus.ACTIVE) return 'ACTIVE';
  return 'LOCKED';
}

// Auto-scheduling engine: suggest optimal task order
export interface ScheduleSlot {
  hour: number;
  taskId: string;
  title: string;
  priority: TaskPriority;
  sortScore: number;
}

/**
 * Optimize schedule using estimatedHours and priorities.
 * Distributes tasks across the day's slots targeting ~8 hours of work.
 * Each slot gets at most 1-2 tasks, and tasks are spread across consecutive slots.
 * Maximum 2 tasks per slot to keep the planner clean and readable.
 * Total target = ~8 hours (shift - 1hr break).
 */
export function autoScheduleTasks(tasks: ProcessedTask[], shiftSlots: number[]): ScheduleSlot[] {
  // Filter tasks that can be scheduled (not completed/approved unless admin override)
  const schedulable = tasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.APPROVED);

  // Sort by priority score (CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1) then by sortScore
  const priorityOrder: Record<TaskPriority, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  const sorted = [...schedulable].sort((a, b) => {
    const pDiff = (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0);
    if (pDiff !== 0) return pDiff;
    return b.sortScore - a.sortScore;
  });

  // Target ~8 hours of work per day (shift - 1hr break), spread across available slots
  const targetSlots = Math.min(8, shiftSlots.length);

  // Track how many tasks are assigned to each slot (max 2 per slot)
  const slotTaskCounts = new Map<number, number>();
  shiftSlots.forEach(s => slotTaskCounts.set(s, 0));

  const result: ScheduleSlot[] = [];

  for (const task of sorted) {
    const estHours = task.estimatedHours || 0.5;
    if (result.length >= targetSlots * 2) break; // max 2 tasks per slot, total cap

    // Find the first slot from the start that has < 2 tasks
    let assigned = false;
    for (const slot of shiftSlots) {
      const count = slotTaskCounts.get(slot) || 0;
      if (count < 2) {
        slotTaskCounts.set(slot, count + 1);
        result.push({
          hour: slot,
          taskId: task.id,
          title: task.title,
          priority: task.priority,
          sortScore: task.sortScore,
        });
        assigned = true;
        break;
      }
    }
    if (!assigned) break; // all slots full
  }

  return result;
}

// Planner date helpers
export function getWeekDates(reference: Date = new Date()): Date[] {
  const start = new Date(reference);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function getMonthGrid(reference: Date = new Date()): Date[] {
  const firstOfMonth = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function getTasksForDate(tasks: ProcessedTask[], date: Date): ProcessedTask[] {
  return tasks.filter(t => {
    if (!t.deadline) return false;
    return isSameDay(t.deadline, date);
  });
}