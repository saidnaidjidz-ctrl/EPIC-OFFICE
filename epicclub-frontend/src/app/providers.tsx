'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { authActions } from '@/store/authStore';
import type { ApiResponse, User } from '@/types';

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
  const [mounted, setMounted] = useState(false);

  // Hydrate auth state from /auth/me on mount
  useEffect(() => {
    setMounted(true);

    const restoreSession = async () => {
      try {
        const response = await apiClient.get<ApiResponse<User>>('/auth/me');
        authActions.onRestore(response.data);
      } catch {
        authActions.onRestoreFailed();
      }
    };

    restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {mounted ? children : null}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
