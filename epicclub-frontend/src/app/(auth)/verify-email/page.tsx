'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get('userId') || '';
  const maskedEmail = searchParams.get('email') || 'your inbox';
  const token = searchParams.get('token') || ''; // For magic link auto-verify

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [autoVerifying, setAutoVerifying] = useState(!!token);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-verify via magic link token
  useEffect(() => {
    if (token) {
      (async () => {
        try {
          setAutoVerifying(true);
          await apiClient.get(`/auth/verify-email/link?token=${encodeURIComponent(token)}`);
          setSuccess(true);
        } catch (err: any) {
          setError(err.message || 'This verification link is invalid or expired.');
        } finally {
          setAutoVerifying(false);
        }
      })();
    }
  }, [token]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/verify-email/otp', {
        user_id: userId,
        otp_code: code,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userId || resendCooldown > 0) return;

    setResendLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/resend-verification', { user_id: userId });
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // ── Render: Auto-verifying ──────────────────────────────────────────────────
  if (autoVerifying) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logoRing}>
            <div style={styles.spinner} />
          </div>
          <h1 style={styles.heading}>Verifying your email...</h1>
          <p style={styles.subtext}>Please wait while we confirm your email address.</p>
        </div>
      </div>
    );
  }

  // ── Render: Success ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ ...styles.logoRing, background: 'linear-gradient(135deg, #059669, #10B981)' }}>
            <span style={styles.logoText}>✓</span>
          </div>
          <h1 style={styles.heading}>Email verified!</h1>
          <p style={styles.subtext}>
            Your email has been confirmed. Your account is now awaiting admin approval.
            We&apos;ll notify you once you&apos;re approved.
          </p>

          <div style={styles.infoBox}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>
                Awaiting admin review
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                Typical review time: 1–3 business days
              </p>
            </div>
          </div>

          <Link href="/login" style={styles.primaryButton}>
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  // ── Render: OTP Input ───────────────────────────────────────────────────────
  const isComplete = otp.every((d) => d !== '');

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRing}>
          <span style={styles.logoText}>EC</span>
        </div>
        <div style={styles.logoLabel}>Epic Club</div>

        {/* Heading */}
        <h1 style={styles.heading}>Check your email</h1>
        <p style={styles.subtext}>
          We sent a 6-digit verification code to{' '}
          <strong style={{ color: '#A855F7' }}>{maskedEmail}</strong>
        </p>

        {/* OTP Inputs */}
        <div style={styles.otpRow} onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              id={`otp-input-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                ...styles.otpInput,
                borderColor: error ? '#EF4444' : digit ? '#7C3AED' : '#334155',
                color: digit ? '#F1F5F9' : '#64748B',
              }}
              aria-label={`Digit ${i + 1} of 6`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Verify Button */}
        <button
          id="verify-otp-btn"
          onClick={handleVerify}
          disabled={loading || !isComplete}
          style={{
            ...styles.primaryButton,
            opacity: loading || !isComplete ? 0.6 : 1,
            cursor: loading || !isComplete ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Verifying...' : 'Verify email'}
        </button>

        {/* Resend */}
        <div style={styles.resendRow}>
          <span style={{ color: '#64748B', fontSize: '14px' }}>Didn&apos;t receive it?</span>{' '}
          <button
            id="resend-verification-btn"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0 || !userId}
            style={{
              background: 'none',
              border: 'none',
              cursor: resendLoading || resendCooldown > 0 ? 'not-allowed' : 'pointer',
              color: resendCooldown > 0 ? '#475569' : '#A855F7',
              fontSize: '14px',
              fontWeight: 600,
              padding: 0,
            }}
          >
            {resendLoading
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend code'}
          </button>
        </div>

        {/* Back link */}
        <Link href="/login" style={styles.backLink}>
          ← Back to login
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  card: {
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '20px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0px',
  },
  logoRing: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
    position: 'relative',
  },
  logoText: {
    fontSize: '26px',
    fontWeight: 900,
    color: '#ffffff',
  },
  logoLabel: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#E2E8F0',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    marginBottom: '28px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255,255,255,0.2)',
    borderTop: '3px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  heading: {
    margin: '0 0 8px',
    fontSize: '24px',
    fontWeight: 700,
    color: '#F1F5F9',
    textAlign: 'center',
  },
  subtext: {
    margin: '0 0 32px',
    fontSize: '14px',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  otpRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    justifyContent: 'center',
  },
  otpInput: {
    width: '48px',
    height: '60px',
    textAlign: 'center',
    fontSize: '26px',
    fontWeight: 700,
    backgroundColor: '#0F172A',
    border: '2px solid #334155',
    borderRadius: '12px',
    color: '#F1F5F9',
    outline: 'none',
    transition: 'border-color 0.15s ease',
    caretColor: '#A855F7',
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#F87171',
    fontSize: '13px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  primaryButton: {
    display: 'block',
    width: '100%',
    background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
    marginBottom: '20px',
    transition: 'opacity 0.2s',
    boxSizing: 'border-box',
  },
  resendRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    marginBottom: '20px',
  },
  backLink: {
    color: '#64748B',
    fontSize: '13px',
    textDecoration: 'none',
  },
  infoBox: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '20px',
    width: '100%',
    marginBottom: '28px',
    boxSizing: 'border-box',
  },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function VerifyEmailPage() {
  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type='text']:focus {
          border-color: #7C3AED !important;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
        }
      `}</style>
      <Suspense>
        <VerifyEmailContent />
      </Suspense>
    </>
  );
}
