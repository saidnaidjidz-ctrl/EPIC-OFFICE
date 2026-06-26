'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^\+?[\d\s\-().]{7,20}$/.test(v), {
      message: 'Enter a valid phone number',
    }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include at least one uppercase letter')
    .regex(/[0-9]/, 'Must include at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Password strength helper ─────────────────────────────────────────────────

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', color: 'bg-error', width: '25%' };
  if (score <= 2) return { label: 'Fair', color: 'bg-warning', width: '50%' };
  if (score <= 3) return { label: 'Good', color: 'bg-accent', width: '75%' };
  return { label: 'Strong', color: 'bg-success', width: '100%' };
}

// ─── Register Page ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');
  const strength = password ? getPasswordStrength(password) : null;

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      const res = await apiClient.post<any>('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
      });

      // Redirect to email verification page
      if (res?.status === 'pending_verification' && res?.userId) {
        router.push(
          `/verify-email?userId=${encodeURIComponent(res.userId)}&email=${encodeURIComponent(res.maskedEmail || '')}`
        );
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setServerError(error?.message || 'Registration failed. Please try again.');
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-glass p-10 flex flex-col items-center text-center gap-6"
      >
        <div className="w-16 h-16 rounded-full bg-success/20 border border-success/40 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Registration Submitted</h2>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            Your account is pending approval from an administrator. You&apos;ll be notified once approved.
          </p>
        </div>
        <Link href="/login" className="btn-primary">
          Back to Sign In
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="card-glass p-8 flex flex-col gap-7">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-glow-cyan">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Request Access
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Join{' '}
              <span className="font-semibold text-gradient-accent">Epic Club</span>
            </p>
          </div>
        </div>

        {/* Info notice */}
        <div className="alert-info text-xs">
          <Info className="w-4 h-4 flex-shrink-0" />
          Your account will require admin approval before you can access the platform.
        </div>

        {/* Server Error */}
        {serverError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="alert-error text-xs"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {serverError}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="name" className="label">Full Name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Ahmed Yıldırım"
              className={`input ${errors.name ? 'input-error' : ''}`}
              {...register('name')}
            />
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="reg-email" className="label">Email Address</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              placeholder="you@epicclub.com"
              className={`input ${errors.email ? 'input-error' : ''}`}
              {...register('email')}
            />
            {errors.email && <p className="error-text">{errors.email.message}</p>}
          </div>

          {/* Phone (optional) */}
          <div className="form-group">
            <label htmlFor="phone" className="label">
              Phone{' '}
              <span className="text-text-secondary font-normal ml-1">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+90 500 000 0000"
              className={`input ${errors.phone ? 'input-error' : ''}`}
              {...register('phone')}
            />
            {errors.phone && <p className="error-text">{errors.phone.message}</p>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="reg-password" className="label">Password</label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                className={`input pr-12 ${errors.password ? 'input-error' : ''}`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength meter */}
            {strength && (
              <div className="mt-2 flex flex-col gap-1">
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${strength.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: strength.width }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className={`text-2xs font-semibold ${
                  strength.label === 'Weak' ? 'text-error' :
                  strength.label === 'Fair' ? 'text-warning' :
                  strength.label === 'Good' ? 'text-accent' : 'text-success'
                }`}>
                  {strength.label}
                </span>
              </div>
            )}
            {errors.password && <p className="error-text">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="label">Confirm Password</label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={`input pr-12 ${errors.confirmPassword ? 'input-error' : ''}`}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors duration-200"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="error-text">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-accent btn-lg w-full mt-1"
          >
            {isSubmitting ? (
              <>
                <span className="spinner border-accent/30 border-t-accent" />
                Creating account...
              </>
            ) : (
              <>
                <UserPlus className="w-4.5 h-4.5" />
                Request Access
              </>
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-accent hover:text-secondary transition-colors duration-200"
          >
            Sign In
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
