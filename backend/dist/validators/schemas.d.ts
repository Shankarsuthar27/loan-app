import { z } from 'zod';
export declare const loginSchema: z.ZodObject<{
    phone_number: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone_number: string;
}, {
    phone_number: string;
}>;
export declare const verifyOtpSchema: z.ZodObject<{
    phone_number: z.ZodString;
    otp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone_number: string;
    otp: string;
}, {
    phone_number: string;
    otp: string;
}>;
export declare const createLoanSchema: z.ZodObject<{
    friend_name: z.ZodString;
    amount: z.ZodNumber;
    due_date: z.ZodEffects<z.ZodString, string, string>;
    receipt_image_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    friend_name: string;
    amount: number;
    due_date: string;
    receipt_image_url?: string | null | undefined;
}, {
    friend_name: string;
    amount: number;
    due_date: string;
    receipt_image_url?: string | null | undefined;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
//# sourceMappingURL=schemas.d.ts.map