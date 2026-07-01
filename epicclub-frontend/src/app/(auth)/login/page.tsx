'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  XCircle,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import Cookies from 'js-cookie';
import axios from 'axios';
import Link from 'next/link';
import { apiClient, API_BASE_URL } from '@/lib/api';
import { authActions, useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginState = 'idle' | 'loading' | 'pending' | 'rejected';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleLoginApproved {
  success: true;
  tokens: { accessToken: string; refreshToken: string };
  user: {
    id: string;
    email: string;
    name: string;
    role: 'president' | 'committee_leader' | 'member';
    committeeId: string | null;
  };
}

interface GoogleLoginPending {
  status: 'pending';
  message: string;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastItem {
  id: string;
  message: string;
  type: 'error' | 'info' | 'success';
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-sm shadow-card-hover text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-error/10 border-error/30 text-error'
                : toast.type === 'success'
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-accent/10 border-accent/30 text-accent'
            }`}
          >
            {toast.type === 'success' ? (
              <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Pending State ────────────────────────────────────────────────────────────

function PendingState({
  onCheckStatus,
  isChecking,
}: {
  onCheckStatus: () => void;
  isChecking: boolean;
}) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          onCheckStatus();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      key="pending"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center text-center gap-6"
    >
      {/* Animated icon */}
      <div className="relative flex items-center justify-center w-32 h-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-2 border-dashed border-secondary/40"
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-secondary/20 to-accent/20 border border-secondary/30 flex items-center justify-center shadow-glow"
        >
          <Clock className="w-10 h-10 text-secondary" />
        </motion.div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
          Under Review
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
          Your request is under review. The president will approve your
          application soon.
        </p>
      </div>

      {/* Shimmer progress bar */}
      <div className="w-full max-w-[260px] bg-surface-2 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-secondary to-accent rounded-full"
          animate={{ x: ['-100%', '150%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '40%' }}
        />
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <button
          id="check-status-btn"
          onClick={onCheckStatus}
          disabled={isChecking}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <span className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />
              Checking…
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Check Status
            </>
          )}
        </button>

        <p className="text-2xs text-text-secondary">
          Auto-checking in&nbsp;
          <motion.span
            key={countdown}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-accent font-semibold tabular-nums"
          >
            {countdown}s
          </motion.span>
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-text-secondary bg-surface-2/50 rounded-xl px-4 py-2.5 border border-border/50 w-full">
        <Users className="w-4 h-4 text-secondary flex-shrink-0" />
        <span>You&apos;ll be notified once approved</span>
      </div>
    </motion.div>
  );
}

// ─── Rejected State ───────────────────────────────────────────────────────────

function RejectedState({ onTryAgain }: { onTryAgain: () => void }) {
  return (
    <motion.div
      key="rejected"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center text-center gap-6"
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="w-24 h-24 rounded-3xl bg-error/10 border border-error/30 flex items-center justify-center"
      >
        <XCircle className="w-12 h-12 text-error" />
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
          Access Denied
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
          Your membership request was not approved. Please contact the club
          president if you believe this was in error.
        </p>
      </div>

      <button
        id="try-again-btn"
        onClick={onTryAgain}
        className="btn-ghost w-full flex items-center justify-center gap-2"
      >
        <ArrowRight className="w-4 h-4" />
        Try a Different Account
      </button>
    </motion.div>
  );
}

// ─── Login Card ───────────────────────────────────────────────────────────────

function LoginCard({
  onGoogleSignIn,
  isLoading,
  gisReady,
  addToast,
}: {
  onGoogleSignIn: () => void;
  isLoading: boolean;
  gisReady: boolean;
  addToast: (msg: string, type: 'error' | 'success' | 'info') => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  const [activeTab, setActiveTab] = useState<'google' | 'credentials'>('google');
  
  // Credentials form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post<{
        success: boolean;
        tokens: { accessToken: string; refreshToken: string };
        user: {
          id: string;
          email: string;
          name: string;
          role: 'president' | 'committee_leader' | 'member';
          status?: string;
          committee_id?: string | null;
          committeeId?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      }>('/auth/login', { email, password });

      const cookieOpts: Cookies.CookieAttributes = {
        expires: 1 / 24, // 1 hour
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      };
      Cookies.set('epicclub_session', res.tokens.accessToken, cookieOpts);
      Cookies.set('epicclub_role', res.user.role, cookieOpts);
      Cookies.set('epicclub_refresh', res.tokens.refreshToken, {
        expires: 7, // 7 days
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      });

      const mappedUser: User = {
        id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
        status: (res.user.status as any) || 'approved',
        committee_id: res.user.committee_id ?? res.user.committeeId ?? null,
        avatar_url: res.user.avatar_url ?? null,
        phone: res.user.phone ?? null,
        bio: res.user.bio ?? null,
        created_at: res.user.created_at ?? new Date().toISOString(),
        updated_at: res.user.updated_at ?? new Date().toISOString(),
      };
      authActions.onLoginSuccess(mappedUser);
      addToast('Successfully signed in! 🎉', 'success');
      setTimeout(() => router.push(redirectTo), 500);
    } catch (err: any) {
      console.error('[Credentials Login Error]', err);
      addToast(err?.message || 'Invalid email or password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      key="login-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center gap-6 w-full"
    >
      {/* Branding */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-white text-2xl font-black tracking-tight select-none">
              EC
            </span>
          </div>
          {/* Breathing ambient glow */}
          <motion.div
            aria-hidden="true"
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.05, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-2xl bg-gradient-primary -z-10"
            style={{ filter: 'blur(20px)' }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-1"
        >
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Epic Club
          </h1>
          <p className="text-text-secondary text-xs font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent" />
            Manage your club like a pro
            <Sparkles className="w-3 h-3 text-secondary" />
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex border border-border/40 rounded-xl p-1 bg-surface-2/30 w-full">
        <button
          onClick={() => setActiveTab('google')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'google'
              ? 'bg-gradient-primary text-white shadow-glow-purple/20'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Google SSO
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'credentials'
              ? 'bg-gradient-primary text-white shadow-glow-purple/20'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Email & Password
        </button>
      </div>

      {/* Glowing divider */}
      <div className="glow-line w-full" />

      {activeTab === 'google' ? (
        /* Sign-in with Google */
        <motion.div
          key="google-tab"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="flex flex-col items-center gap-4 w-full"
        >
          <p className="text-text-secondary text-xs text-center px-4">
            Sign in with your Google account to access the dashboard
          </p>

          {isLoading ? (
            <div className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white rounded-xl font-semibold text-gray-800 text-sm shadow-card min-h-[44px]">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-secondary rounded-full animate-spin" />
              <span className="text-gray-500">Verifying session…</span>
            </div>
          ) : (
            <div
              id="google-signin-btn"
              className="w-full flex justify-center min-h-[44px] bg-white rounded-xl overflow-hidden shadow-card"
            />
          )}

          {!gisReady && !isLoading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-text-secondary flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse inline-block" />
              Loading Google Sign-In…
            </motion.p>
          )}
        </motion.div>
      ) : (
        /* Sign-in with Email & Password */
        <motion.form
          key="credentials-tab"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          onSubmit={handleCredentialsSubmit}
          className="flex flex-col gap-4 w-full"
        >
          {/* Email input */}
          <div className="form-group flex flex-col gap-1.5">
            <label htmlFor="login-email" className="label text-xs font-semibold text-text-secondary">Email Address</label>
            <div className="relative">
              <input
                id="login-email"
                type="email"
                placeholder="you@epicclub.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10"
              />
              <Mail className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Password input */}
          <div className="form-group flex flex-col gap-1.5">
            <label htmlFor="login-password" className="label text-xs font-semibold text-text-secondary">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10 pr-10"
              />
              <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 rounded-xl font-semibold shadow-glow-purple/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {isSubmitting ? (
              <>
                <span className="spinner !w-4 !h-4 !border-white/30 !border-t-white" />
                Signing in…
              </>
            ) : (
              <>
                <span>Sign In with Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-text-secondary mt-1">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-accent hover:underline font-semibold"
            >
              Request Access
            </Link>
          </p>
        </motion.form>
      )}

      {/* Developer Bypass Panel for Local Testing */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full flex flex-col gap-3 p-4 rounded-xl bg-surface-2/30 border border-border/40 mt-1"
      >
        <div className="flex items-center justify-between text-2xs text-text-secondary uppercase tracking-wider font-semibold">
          <span>Local Development Bypass</span>
          <span className="text-accent-secondary font-mono text-[10px]">No DB/Auth Required</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              const mockUser = {
                id: 'mock-president',
                email: 'president@epicclub.com',
                name: 'President Demo (Bypass)',
                role: 'president' as const,
                status: 'approved' as const,
                committee_id: null,
                avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80',
                phone: '+12345678',
                bio: 'President & Administrator',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              Cookies.set('epicclub_session', 'mock_token_president', { expires: 1/24, sameSite: 'strict' });
              Cookies.set('epicclub_role', 'president', { expires: 1/24, sameSite: 'strict' });
              authActions.onLoginSuccess(mockUser);
              addToast('Logged in as President! 👑', 'success');
              setTimeout(() => router.push(redirectTo), 500);
            }}
            className="px-2 py-2 bg-gradient-to-r from-accent/20 to-accent-secondary/20 hover:from-accent/30 hover:to-accent-secondary/30 text-accent border border-accent/20 rounded-lg text-xs font-bold transition-all active:scale-95"
          >
            President 👑
          </button>
          <button
            onClick={() => {
              const mockUser = {
                id: 'mock-leader',
                email: 'leader@epicclub.com',
                name: 'Leader Demo (Bypass)',
                role: 'committee_leader' as const,
                status: 'approved' as const,
                committee_id: 'mock-committee-tech',
                avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&auto=format&fit=crop&q=80',
                phone: '+12345679',
                bio: 'Technical Committee Leader',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              Cookies.set('epicclub_session', 'mock_token_leader', { expires: 1/24, sameSite: 'strict' });
              Cookies.set('epicclub_role', 'committee_leader', { expires: 1/24, sameSite: 'strict' });
              authActions.onLoginSuccess(mockUser);
              addToast('Logged in as Leader! 🏛️', 'success');
              setTimeout(() => router.push(redirectTo), 500);
            }}
            className="px-2 py-2 bg-gradient-to-r from-secondary/20 to-accent/20 hover:from-secondary/30 hover:to-accent/30 text-secondary border border-secondary/20 rounded-lg text-xs font-bold transition-all active:scale-95"
          >
            Leader 🏛️
          </button>
          <button
            onClick={() => {
              const mockUser = {
                id: 'mock-member',
                email: 'member@epicclub.com',
                name: 'Member Demo (Bypass)',
                role: 'member' as const,
                status: 'approved' as const,
                committee_id: 'mock-committee-tech',
                avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
                phone: '+12345680',
                bio: 'Active Member',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              Cookies.set('epicclub_session', 'mock_token_member', { expires: 1/24, sameSite: 'strict' });
              Cookies.set('epicclub_role', 'member', { expires: 1/24, sameSite: 'strict' });
              authActions.onLoginSuccess(mockUser);
              addToast('Logged in as Member! ✅', 'success');
              setTimeout(() => router.push(redirectTo), 500);
            }}
            className="px-2 py-2 bg-gradient-to-r from-success/20 to-success/10 hover:from-success/30 hover:to-success/20 text-success border border-success/20 rounded-lg text-xs font-bold transition-all active:scale-95"
          >
            Member ✅
          </button>
        </div>
      </motion.div>

      {/* Security note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 text-xs text-text-secondary"
      >
        <ShieldCheck className="w-4 h-4 text-success flex-shrink-0" />
        <span>Secured by Google OAuth 2.0 · Sessions encrypted end-to-end</span>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Login Form ──────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';
  const { isAuthenticated, isInitialized } = useAuthStore();

  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [isChecking, setIsChecking] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [serverWaking, setServerWaking] = useState(false);

  // ── Wake up Render server on page load ──────────────────────────────────
  useEffect(() => {
    const wakeServer = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60_000);
        const res = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
          signal: controller.signal,
          mode: 'no-cors',
        });
        clearTimeout(timeoutId);
        setServerWaking(false);
      } catch {
        setServerWaking(false);
      }
    };

    // Probe the backend – if slow, show waking indicator
    const timer = setTimeout(() => {
      setServerWaking(true);
      wakeServer();
    }, 300);

    // Quick check first
    fetch(`${API_BASE_URL.replace('/api', '')}/health`, { mode: 'no-cors' })
      .then(() => { clearTimeout(timer); setServerWaking(false); })
      .catch(() => { /* will retry in wakeServer */ });

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable ref so GIS callback always calls the latest version of the handler
  const handleGoogleSuccessRef = useRef<((idToken: string) => Promise<void>) | null>(null);

  // ── Redirect if already authenticated ─────────────────────────────────────
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isInitialized, isAuthenticated, router, redirectTo]);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback(
    (message: string, type: ToastItem['type'] = 'error') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        5000
      );
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Google Auth → Backend ─────────────────────────────────────────────────
  const handleGoogleSuccess = useCallback(
    async (idToken: string) => {
      setLoginState('loading');
      try {
        console.log('[LOGIN] Sending id_token to backend...');
        // Use raw axios to bypass the global 403 redirect interceptor
        const res = await axios.post<GoogleLoginApproved | GoogleLoginPending>(
          `${API_BASE_URL}/auth/google`,
          { id_token: idToken },
          { withCredentials: true }
        );

        console.log('[LOGIN] Backend response:', res);
        const data = res.data;

        // 202 Pending approval
        if ('status' in data && data.status === 'pending') {
          setLoginState('pending');
          return;
        }

        // 200 Approved
        const approved = data as GoogleLoginApproved;

        const cookieOpts: Cookies.CookieAttributes = {
          expires: 1 / 96, // 15 min
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        };
        Cookies.set('epicclub_session', approved.tokens.accessToken, cookieOpts);
        Cookies.set('epicclub_role', approved.user.role, cookieOpts);
        Cookies.set('epicclub_refresh', approved.tokens.refreshToken, {
          expires: 7, // 7 days
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        });

        const storeUser: User = {
          id: approved.user.id,
          email: approved.user.email,
          name: approved.user.name,
          role: approved.user.role,
          status: 'approved',
          committee_id: approved.user.committeeId,
          avatar_url: null,
          phone: null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        authActions.onLoginSuccess(storeUser);

        addToast('Welcome to Epic Club! 🎉', 'success');
        setTimeout(() => router.push(redirectTo), 500);
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        const status = axiosErr?.status;

        if (status === 403) {
          setLoginState('rejected');
          return;
        }
        if (status === 202) {
          setLoginState('pending');
          return;
        }

        addToast(
          status
            ? (axiosErr.message ?? 'Something went wrong. Please try again.')
            : 'Connection failed. Check your network and try again.',
          'error'
        );
        setLoginState('idle');
      }
    },
    [addToast, redirectTo, router]
  );

  // Keep ref in sync
  useEffect(() => {
    handleGoogleSuccessRef.current = handleGoogleSuccess;
  }, [handleGoogleSuccess]);

  // ── GIS credential callback (stable identity) ──────────────────────────────
  const handleCredentialResponse = useCallback(
    (response: GoogleCredentialResponse) => {
      console.log('[LOGIN] Google response received:', response);
      console.log('[LOGIN] Sending id_token to backend...');
      handleGoogleSuccessRef.current?.(response.credential);
    },
    []
  );

  // ── Initialize and Load GIS ──────────────────────────────────────────────
  useEffect(() => {
    const g = (window as any).google;
    if (g?.accounts?.id) {
      g.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
        ux_mode: 'popup',
      });
      setGisReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const g2 = (window as any).google;
      if (g2?.accounts?.id) {
        g2.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          ux_mode: 'popup',
        });
        setGisReady(true);
      }
    };
    script.onerror = () => {
      addToast('Failed to load Google Sign-In. Please refresh the page.', 'error');
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [handleCredentialResponse, addToast]);

  // ── Render Google Button when GIS is ready ──────────────────────────────
  useEffect(() => {
    if (gisReady && (loginState === 'idle' || loginState === 'loading')) {
      const btn = document.getElementById('google-signin-btn');
      const g = (window as any).google;
      if (btn && g) {
        g.accounts.id.renderButton(btn, {
          theme: 'outline',
          size: 'large',
          width: 320,
        });
      }
    }
  }, [gisReady, loginState]);

  // ── Poll approval status ──────────────────────────────────────────────────
  const checkApprovalStatus = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const res = await axios.get<{ success: boolean; user?: User; status?: string }>(
        `${API_BASE_URL}/auth/me`,
        { withCredentials: true }
      );

      const userStatus = res.data?.user?.status ?? res.data?.status;

      if (userStatus === 'approved' && res.data.user) {
        authActions.onLoginSuccess(res.data.user);

        // Refresh role cookie from polled user
        Cookies.set('epicclub_role', res.data.user.role, {
          expires: 1 / 96,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        });

        addToast('Your account has been approved! Redirecting…', 'success');
        setTimeout(() => router.push(redirectTo), 800);
      } else if (userStatus === 'rejected') {
        setLoginState('rejected');
      } else {
        addToast("Still under review — we'll check again in 30s.", 'info');
      }
    } catch {
      addToast('Could not check status. Please try again.', 'error');
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, addToast, redirectTo, router]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Server waking banner */}
      {serverWaking && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-4 px-4 py-3 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-3 text-xs text-warning"
        >
          <span className="w-3 h-3 rounded-full bg-warning animate-pulse flex-shrink-0" />
          <span>Server is waking up from sleep mode — please wait a moment before signing in…</span>
        </motion.div>
      )}

      {/* Card — the layout already centers this */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        <div className="card-glass p-8 md:p-10 w-full">
          <AnimatePresence mode="wait">
            {loginState === 'idle' || loginState === 'loading' ? (
              <LoginCard
                key="login-card"
                onGoogleSignIn={() => {}}
                isLoading={loginState === 'loading'}
                gisReady={gisReady}
                addToast={addToast}
              />
            ) : loginState === 'pending' ? (
              <PendingState
                key="pending-state"
                onCheckStatus={checkApprovalStatus}
                isChecking={isChecking}
              />
            ) : (
              <RejectedState
                key="rejected-state"
                onTryAgain={() => setLoginState('idle')}
              />
            )}
          </AnimatePresence>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-2xs text-text-secondary mt-4 px-4"
        >
          By signing in you agree to Epic Club&apos;s{' '}
          <span className="text-accent hover:underline cursor-pointer transition-colors">
            Terms of Service
          </span>{' '}
          and{' '}
          <span className="text-accent hover:underline cursor-pointer transition-colors">
            Privacy Policy
          </span>
          .
        </motion.p>
      </motion.div>
    </>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner spinner-lg" />
            <p className="text-xs text-text-secondary">Loading…</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
