'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { authActions } from '@/store/authStore';
import type { ApiResponse, User } from '@/types';
import Cookies from 'js-cookie';

// ─── QueryClient Factory ──────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,             // 1 minute
        gcTime: 5 * 60_000,            // 5 minutes
        retry: (failureCount, error: unknown) => {
          const status = (error as { status?: number })?.status;
          // Don't retry on 4xx errors
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: reuse the same query client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

// ─── Providers ────────────────────────────────────────────────────────────────

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = getQueryClient();

  // Hydrate auth state from /auth/me on mount
  useEffect(() => {
    const restoreSession = async () => {
      const sessionToken = Cookies.get('epicclub_session');
      const refreshToken = Cookies.get('epicclub_refresh');
      if (!sessionToken && !refreshToken) {
        authActions.onRestoreFailed();
        return;
      }

      try {
        const response = await apiClient.get<{
          success: boolean;
          user: {
            id: string;
            email: string;
            name: string;
            role: 'president' | 'committee_leader' | 'member';
            status?: string;
            committeeId?: string | null;
            committee_id?: string | null;
            avatarUrl?: string | null;
            avatar_url?: string | null;
            phone?: string | null;
            bio?: string | null;
            createdAt?: string;
            created_at?: string;
            updated_at?: string;
          };
        }>('/auth/me');

        if (response && response.user) {
          const mappedUser: User = {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: response.user.role,
            status: (response.user.status as any) || 'approved',
            committee_id: response.user.committee_id ?? response.user.committeeId ?? null,
            avatar_url: response.user.avatar_url ?? response.user.avatarUrl ?? null,
            phone: response.user.phone ?? null,
            bio: response.user.bio ?? null,
            created_at: response.user.created_at ?? response.user.createdAt ?? new Date().toISOString(),
            updated_at: response.user.updated_at ?? new Date().toISOString(),
          };
          authActions.onRestore(mappedUser);
        } else {
          authActions.onRestoreFailed();
        }
      } catch {
        authActions.onRestoreFailed();
      }
    };

    restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
