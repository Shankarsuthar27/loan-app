"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoanSchema = exports.verifyOtpSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
// ---- Auth Validators ----
exports.loginSchema = zod_1.z.object({
    phone_number: zod_1.z
        .string()
        .min(7, 'Phone number too short')
        .max(20, 'Phone number too long')
        .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number format'),
});
exports.verifyOtpSchema = zod_1.z.object({
    phone_number: zod_1.z
        .string()
        .min(7)
        .max(20)
        .regex(/^\+?[0-9\s\-()]+$/),
    otp: zod_1.z
        .string()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d{6}$/, 'OTP must contain only digits'),
});
// ---- Loan Validators ----
exports.createLoanSchema = zod_1.z.object({
    friend_name: zod_1.z
        .string()
        .min(1, 'Friend name is required')
        .max(100, 'Friend name too long')
        .trim(),
    amount: zod_1.z
        .number({ invalid_type_error: 'Amount must be a number' })
        .positive('Amount must be greater than 0')
        .max(9999999.99, 'Amount exceeds maximum'),
    due_date: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
        .refine((date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
    }, 'Invalid date'),
    receipt_image_url: zod_1.z.string().url().optional().nullable(),
});
//# sourceMappingURL=schemas.js.map