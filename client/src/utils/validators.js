import { z } from 'zod';

// Mirrors the server rule in server/src/utils/validation.js so the two cannot drift.
const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z
  .object({
    customerName: z.string().min(2, 'Enter your name'),
    email: z.string().email('Enter a valid email address'),
    mobile: z.string().min(10, 'Enter a mobile number of at least 10 digits'),
    address: z.string().min(6, 'Enter your full address'),
    city: z.string().min(2, 'Enter your city'),
    state: z.string().min(2, 'Choose your state'),
    country: z.string().min(2, 'Choose your country'),
    pinCode: z.string().min(4, 'Enter your pin code'),
    companyName: z.string().min(2, 'Enter your company name'),
    gstNumber: z.string().optional(),
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Enter your password again'),
    acceptedTerms: z.boolean().refine((value) => value, 'Please accept the terms'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  });

export const checkoutSchema = z.object({
  notes: z.string().optional(),
});
