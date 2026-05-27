import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  accountName: z.string().min(3),
  userName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const planSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']),
  maxConnections: z.number().int().min(1),
  extraConnectionPrice: z.number().min(0).optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

export const serverSchema = z.object({
  name: z.string().min(1),
  panelUrl: z.string().url(),
  panelNotes: z.string().optional(),
  maxConnections: z.number().int().min(1).optional(),
  status: z.enum(['active', 'maintenance', 'full']).default('active'),
});

export const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export type PlanInput = z.infer<typeof planSchema>;
export type ServerInput = z.infer<typeof serverSchema>;
export type TagInput = z.infer<typeof tagSchema>;
