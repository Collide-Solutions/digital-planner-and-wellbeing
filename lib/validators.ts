import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  requiresProof: z.boolean().optional(),
  estimatedHours: z.coerce.number().min(0.25).max(24).optional(),
  assignedToId: z.string().optional(),
  date: z.string().optional()
});

export const taskRequestActionSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['accept', 'decline'])
});

export const approvalActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  feedback: z.string().max(800).optional()
});

export const announcementSchema = z.object({
  title: z.string().min(5),
  content: z.string().min(10)
});

export const leaveRequestSchema = z.object({
  reason: z.string().min(10),
  startDate: z.string().min(10),
  endDate: z.string().min(10)
});