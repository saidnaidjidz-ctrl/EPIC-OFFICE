-- Migration 002: Email Verification System
-- Adds email_verifications table and updates users status enum

-- Add new status value 'pending_verification' to user_status enum
-- Note: PostgreSQL requires adding enum values in a specific order
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending_verification' BEFORE 'pending';

-- Create email_verifications table
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,

    -- 6-digit OTP code (stored as hashed value)
    otp_code_hash TEXT NOT NULL,
    otp_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- One-click magic link token (stored as hashed value)
    link_token_hash TEXT NOT NULL,
    link_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Whether this verification record has been used
    verified BOOLEAN NOT NULL DEFAULT false,

    -- Resend throttling: track attempts
    resend_count INTEGER NOT NULL DEFAULT 0,
    last_resent_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_link_token ON email_verifications (link_token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verifications_user_id_unverified
    ON email_verifications (user_id)
    WHERE verified = false;
