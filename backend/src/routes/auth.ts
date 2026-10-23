import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../supabaseClient';
import { validate } from '../middleware/validate';
import { loginSchema, verifyOtpSchema } from '../validators/schemas';

const router = Router();

// In-memory fallback stores for development when Supabase tables are not yet created
const memoryUsers = new Map<string, { id: string; phone_number: string }>();
const memoryOtps = new Map<string, { otp: string; expires_at: Date; used: boolean }>();

/**
 * Normalizes phone numbers (removes spaces, hyphens, parentheses).
 */
const cleanPhone = (p: string): string => p.replace(/[\s\-()]/g, '').trim();

/**
 * Generates a random 6-digit OTP string.
 */
const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ----------------------------------------------------------------
// POST /auth/login
// Accepts phone number, generates mock OTP, prints to console.
// ----------------------------------------------------------------
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  const rawPhone = (req.body as { phone_number: string }).phone_number;
  const phone_number = cleanPhone(rawPhone);
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  let usedMemoryFallback = false;

  try {
    // Upsert user record in Supabase
    const { error: userError } = await supabase
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
      } else {
        console.error('User upsert error:', userError);
        res.status(500).json({ success: false, message: 'Failed to process request' });
        return;
      }
    }

    if (!usedMemoryFallback) {
      // Delete any existing unused OTPs for this number
      await supabase
        .from('otp_store')
        .delete()
        .eq('phone_number', phone_number)
        .eq('used', false);

      const { error: otpError } = await supabase.from('otp_store').insert({
        phone_number,
        otp,
        expires_at: expiresAt.toISOString(),
      });

      if (otpError) {
        console.error('OTP store error:', otpError);
        // Fallback to memory if otp_store doesn't exist
        memoryOtps.set(phone_number, { otp, expires_at: expiresAt, used: false });
      }
    } else {
      memoryOtps.set(phone_number, { otp, expires_at: expiresAt, used: false });
    }

    // 🔐 MOCK: Print OTP to server console instead of sending SMS
    console.log('\n====================================');
    console.log(`📱 MOCK OTP for ${phone_number}: ${otp}`);
    console.log(`   (Master dev OTP "123456" is also accepted)`);
    console.log('   (Valid for 10 minutes)');
    console.log('====================================\n');

    res.status(200).json({
      success: true,
      message: `OTP sent! For dev testing, your OTP is: ${otp} (or 123456)`,
      data: {
        otp, // included for easy dev debugging in client
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ----------------------------------------------------------------
// POST /auth/verify
// Accepts phone number + OTP, returns JWT token.
// ----------------------------------------------------------------
router.post('/verify', validate(verifyOtpSchema), async (req: Request, res: Response) => {
  const rawPhone = (req.body as { phone_number: string; otp: string }).phone_number;
  const otp = (req.body as { phone_number: string; otp: string }).otp.trim();
  const phone_number = cleanPhone(rawPhone);

  console.log(`\n🔍 [VERIFY REQUEST] Phone: "${phone_number}", OTP: "${otp}"`);

  // Universal Dev OTP: 123456 is always accepted in development mode
  const isDevMasterOtp = process.env.NODE_ENV !== 'production' && otp === '123456';

  try {
    let matchedUserId: string | null = null;
    let matchedPhone: string = phone_number;
    let isOtpValid = false;

    // Check Supabase first
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_store')
      .select('*')
      .eq('phone_number', phone_number)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!otpError && otpRecord) {
      if (new Date(otpRecord.expires_at) < new Date() && !isDevMasterOtp) {
        console.warn(`❌ OTP for ${phone_number} has expired`);
        res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        return;
      }

      if (otpRecord.otp === otp || isDevMasterOtp) {
        isOtpValid = true;
        await supabase.from('otp_store').update({ used: true }).eq('id', otpRecord.id);

        const { data: user } = await supabase
          .from('users')
          .select('id, phone_number')
          .eq('phone_number', phone_number)
          .single();

        if (user) {
          matchedUserId = user.id;
          matchedPhone = user.phone_number;
        }
      } else {
        console.warn(`❌ OTP mismatch for ${phone_number}: received "${otp}", expected "${otpRecord.otp}"`);
      }
    } else {
      // In-memory fallback check
      // Find OTP by exact match or suffix match (e.g. 9664471637 vs +919664471637)
      let memKey = phone_number;
      let mem = memoryOtps.get(phone_number);

      if (!mem) {
        for (const [k, v] of memoryOtps.entries()) {
          if (k.endsWith(phone_number) || phone_number.endsWith(k)) {
            memKey = k;
            mem = v;
            break;
          }
        }
      }

      if (isDevMasterOtp) {
        isOtpValid = true;
      } else if (!mem) {
        console.warn(`❌ No OTP found for phone "${phone_number}". Available keys:`, Array.from(memoryOtps.keys()));
        res.status(400).json({ success: false, message: 'No OTP requested for this phone number' });
        return;
      } else if (mem.used) {
        console.warn(`❌ OTP for "${phone_number}" was already used`);
        res.status(400).json({ success: false, message: 'OTP already used. Please request a new one.' });
        return;
      } else if (mem.expires_at < new Date()) {
        console.warn(`❌ OTP for "${phone_number}" has expired`);
        res.status(400).json({ success: false, message: 'OTP has expired' });
        return;
      } else if (mem.otp === otp) {
        isOtpValid = true;
        mem.used = true;
      } else {
        console.warn(`❌ OTP mismatch for "${phone_number}": received "${otp}", expected "${mem.otp}"`);
      }

      if (isOtpValid) {
        const memUser = memoryUsers.get(memKey) ?? memoryUsers.get(phone_number) ?? {
          id: `dev-${phone_number}`,
          phone_number,
        };
        matchedUserId = memUser.id;
        matchedPhone = memUser.phone_number;
      }
    }

    if (!isOtpValid) {
      res.status(400).json({ success: false, message: 'Invalid OTP. Please check the backend console or use 123456.' });
      return;
    }

    if (!matchedUserId) {
      matchedUserId = `dev-${phone_number}`;
    }

    // Sign JWT token
    const token = jwt.sign(
      { userId: matchedUserId, phone: matchedPhone },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    console.log(`✅ [LOGIN SUCCESS] User authenticated: ${matchedPhone} (${matchedUserId})\n`);

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
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
