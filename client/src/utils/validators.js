import { z } from 'zod';

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
    password: z.string().min(8),
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
  newPassword: z.string().optional(),
});

export const checkoutSchema = z.object({
  shippingAddress: z.string().min(6),
  notes: z.string().optional(),
  paymentMethod: z.enum(['Cash on Delivery', 'Offline Payment']),
});
