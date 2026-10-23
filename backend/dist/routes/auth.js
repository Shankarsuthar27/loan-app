"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabaseClient_1 = require("../supabaseClient");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validators/schemas");
const router = (0, express_1.Router)();
// In-memory fallback stores for development when Supabase tables are not yet created
const memoryUsers = new Map();
const memoryOtps = new Map();
/**
 * Generates a random 6-digit OTP string.
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
// ----------------------------------------------------------------
// POST /auth/login
// Accepts phone number, generates mock OTP, prints to console.
// ----------------------------------------------------------------
router.post('/login', (0, validate_1.validate)(schemas_1.loginSchema), async (req, res) => {
    const { phone_number } = req.body;
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    let usedMemoryFallback = false;
    try {
        // Upsert user record in Supabase
        const { error: userError } = await supabaseClient_1.supabase
            .from('users')
            .upsert({ phone_number }, { onConflict: 'phone_number', ignoreDuplicates: false });
        if (userError) {
            if (userError.code === 'PGRST205') {
                console.warn('\n⚠️ [DEV NOTICE] Table "users" not found in Supabase. Using in-memory fallback.');
                console.warn('   Run schema.sql in your Supabase SQL Editor to enable persistent PostgreSQL storage.\n');
                usedMemoryFallback = true;
                if (!memoryUsers.has(phone_number)) {
                    memoryUsers.set(phone_number, { id: `dev-${Date.now()}`, phone_number });
                }
            }
            else {
                console.error('User upsert error:', userError);
                res.status(500).json({ success: false, message: 'Failed to process request' });
                return;
            }
        }
        if (!usedMemoryFallback) {
            // Delete any existing unused OTPs for this number
            await supabaseClient_1.supabase
                .from('otp_store')
                .delete()
                .eq('phone_number', phone_number)
                .eq('used', false);
            const { error: otpError } = await supabaseClient_1.supabase.from('otp_store').insert({
                phone_number,
                otp,
                expires_at: expiresAt.toISOString(),
            });
            if (otpError) {
                console.error('OTP store error:', otpError);
                // Fallback to memory if otp_store doesn't exist
                memoryOtps.set(phone_number, { otp, expires_at: expiresAt, used: false });
            }
        }
        else {
            memoryOtps.set(phone_number, { otp, expires_at: expiresAt, used: false });
        }
        // 🔐 MOCK: Print OTP to server console instead of sending SMS
        console.log('\n====================================');
        console.log(`📱 MOCK OTP for ${phone_number}: ${otp}`);
        console.log('   (Valid for 10 minutes)');
        console.log('====================================\n');
        res.status(200).json({
            success: true,
            message: 'OTP sent to your phone number (check server console in dev mode)',
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
// ----------------------------------------------------------------
// POST /auth/verify
// Accepts phone number + OTP, returns JWT token.
// ----------------------------------------------------------------
router.post('/verify', (0, validate_1.validate)(schemas_1.verifyOtpSchema), async (req, res) => {
    const { phone_number, otp } = req.body;
    try {
        let matchedUserId = null;
        let matchedPhone = phone_number;
        // Check Supabase first
        const { data: otpRecord, error: otpError } = await supabaseClient_1.supabase
            .from('otp_store')
            .select('*')
            .eq('phone_number', phone_number)
            .eq('used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (!otpError && otpRecord) {
            if (new Date(otpRecord.expires_at) < new Date()) {
                res.status(400).json({ success: false, message: 'OTP has expired' });
                return;
            }
            if (otpRecord.otp !== otp) {
                res.status(400).json({ success: false, message: 'Invalid OTP' });
                return;
            }
            await supabaseClient_1.supabase.from('otp_store').update({ used: true }).eq('id', otpRecord.id);
            const { data: user } = await supabaseClient_1.supabase
                .from('users')
                .select('id, phone_number')
                .eq('phone_number', phone_number)
                .single();
            if (user) {
                matchedUserId = user.id;
                matchedPhone = user.phone_number;
            }
        }
        else {
            // In-memory fallback check
            const mem = memoryOtps.get(phone_number);
            if (!mem || mem.used) {
                res.status(400).json({ success: false, message: 'OTP not found or already used' });
                return;
            }
            if (mem.expires_at < new Date()) {
                res.status(400).json({ success: false, message: 'OTP has expired' });
                return;
            }
            if (mem.otp !== otp) {
                res.status(400).json({ success: false, message: 'Invalid OTP' });
                return;
            }
            mem.used = true;
            const memUser = memoryUsers.get(phone_number) ?? { id: `dev-${phone_number}`, phone_number };
            matchedUserId = memUser.id;
            matchedPhone = memUser.phone_number;
        }
        if (!matchedUserId) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        // Sign JWT
        const token = jsonwebtoken_1.default.sign({ userId: matchedUserId, phone: matchedPhone }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: matchedUserId,
                    phone_number: matchedPhone,
                },
            },
        });
    }
    catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map