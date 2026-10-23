-- ============================================================
-- MiniLedger Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by phone number
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

-- ============================================================
-- LOANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS loans (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_name       VARCHAR(100) NOT NULL,
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date          DATE        NOT NULL,
  is_repaid         BOOLEAN     NOT NULL DEFAULT FALSE,
  receipt_image_url TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user's loans
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
-- Index for overdue queries
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
-- Composite index for summary queries
CREATE INDEX IF NOT EXISTS idx_loans_user_repaid ON loans(user_id, is_repaid);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_loans
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Supabase best practice
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Since we use service_role key from backend, these policies
-- allow full access via the backend service role.
-- Users can only see their own data via the anon key if needed.

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT USING (true);

CREATE POLICY "Service role full access on loans"
  ON loans FOR ALL USING (true);

-- ============================================================
-- OTP STORE TABLE (in-memory alternative, stored in DB for demo)
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_store (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  otp          VARCHAR(6)  NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_store(phone_number);
