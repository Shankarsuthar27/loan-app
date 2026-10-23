import { z } from 'zod';

// ---- Auth Validators ----
export const loginSchema = z.object({
  phone_number: z
    .string()
    .min(7, 'Phone number too short')
    .max(20, 'Phone number too long')
    .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number format'),
});

export const verifyOtpSchema = z.object({
  phone_number: z
    .string()
    .min(7)
    .max(20)
    .regex(/^\+?[0-9\s\-()]+$/),
  otp: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

// ---- Loan Validators ----
export const createLoanSchema = z.object({
  friend_name: z
    .string()
    .min(1, 'Friend name is required')
    .max(100, 'Friend name too long')
    .trim(),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .max(9999999.99, 'Amount exceeds maximum'),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid date'),
  receipt_image_url: z.string().url().optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
