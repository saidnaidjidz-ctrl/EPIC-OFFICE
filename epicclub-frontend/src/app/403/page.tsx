'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldOff, Home, ArrowLeft } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-error/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative text-center max-w-md w-full space-y-8"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 200, damping: 18 }}
          className="flex items-center justify-center mx-auto"
        >
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-error/15 blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-error/10 border border-error/30 flex items-center justify-center shadow-lg shadow-error/10">
              <ShieldOff className="w-10 h-10 text-error" />
            </div>
          </div>
        </motion.div>

        {/* Code */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <p className="text-[120px] font-black leading-none tracking-tighter text-white/5 select-none">
            403
          </p>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="-mt-12 space-y-3"
        >
          <h1 className="text-2xl font-extrabold text-white">Access Denied</h1>
          <p className="text-text-secondary text-sm leading-relaxed max-w-sm mx-auto">
            You don&apos;t have the required permissions to view this page.
            Please contact your administrator if you believe this is a mistake.
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-6"
        />

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 font-semibold text-sm hover:bg-secondary/20 transition-all"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 text-text-secondary border border-white/10 font-semibold text-sm hover:bg-white/10 hover:text-text-primary transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </motion.div>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-xs text-text-secondary/50"
        >
          Error code: 403 &nbsp;·&nbsp; Forbidden
        </motion.p>
      </motion.div>
    </div>
  );
}
