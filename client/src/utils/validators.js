import { z } from 'zod';

// Mirrors the server rule in server/src/utils/validation.js so the two cannot drift.
const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z
  .object({
    customerName: z.string().min(2),
    email: z.string().email(),
    mobile: z.string().min(10),
    address: z.string().min(6),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().min(2),
    pinCode: z.string().min(4),
    companyName: z.string().min(2),
    gstNumber: z.string().optional(),
    password: passwordRule,
    confirmPassword: z.string().min(8),
    acceptedTerms: z.boolean().refine((value) => value, 'Please accept the terms'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().optional(),
  newPassword: passwordRule.optional(),
});

export const checkoutSchema = z.object({
  notes: z.string().optional(),
});
