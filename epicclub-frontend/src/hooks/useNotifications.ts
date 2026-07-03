import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { playNotificationSound } from '@/lib/notificationSounds';
import type { Notification, PaginatedResponse, ApiResponse } from '@/types';
import Cookies from 'js-cookie';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// Helper to build SSE stream URL with token as query param
// EventSource does not support Authorization headers, so we pass
// the access token via ?token= which the backend auth middleware accepts.
const getStreamUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const token = Cookies.get('epicclub_session');
  const url = `${cleanBaseUrl}/notifications/stream`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
};

export function useNotifications(filters: { page?: number; limit?: number; unread_only?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const addToast = useNotificationStore((state) => state.addToast);
  const setSseConnected = useNotificationStore((state) => state.setSseConnected);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(1000); // Start with 1s reconnect delay
  const eventSourceRef = useRef<EventSource | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const notificationsQuery = useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean;
        notifications: Notification[];
        pagination: PaginatedResponse<Notification>['pagination'];
      }>('/notifications', filters);
      return response;
    },
    enabled: isAuthenticated,
  });

  const unreadCountQuery = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean;
        unread_count: number;
      }>('/notifications/unread-count');
      return response.unread_count;
    },
    enabled: isAuthenticated,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousUnread = queryClient.getQueryData<number>(notificationKeys.unreadCount());

      // Optimistic updates for unread count
      if (previousUnread !== undefined && previousUnread > 0) {
        queryClient.setQueryData<number>(notificationKeys.unreadCount(), previousUnread - 1);
      }

      // Optimistic updates for list
      queryClient.setQueriesData<{ notifications: Notification[] }>(
        { queryKey: notificationKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === id ? { ...n, is_read: true } : n
            ),
          };
        }
      );

      return { previousUnread };
    },
    onError: (_err, _id, context) => {
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnread);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiClient.patch<ApiResponse<{ count: number }>>('/notifications/read-all'),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousUnread = queryClient.getQueryData<number>(notificationKeys.unreadCount());

      queryClient.setQueryData<number>(notificationKeys.unreadCount(), 0);

      queryClient.setQueriesData<{ notifications: Notification[] }>(
        { queryKey: notificationKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) => ({ ...n, is_read: true })),
          };
        }
      );

      return { previousUnread };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnread);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete<ApiResponse<void>>(`/notifications/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousUnread = queryClient.getQueryData<number>(notificationKeys.unreadCount());

      queryClient.setQueriesData<{ notifications: Notification[] }>(
        { queryKey: notificationKeys.lists() },
        (old) => {
          if (!old) return old;
          const wasUnread = old.notifications.find((n) => n.id === id)?.is_read === false;
          if (wasUnread && previousUnread !== undefined && previousUnread > 0) {
            queryClient.setQueryData<number>(notificationKeys.unreadCount(), previousUnread - 1);
          }
          return {
            ...old,
            notifications: old.notifications.filter((n) => n.id !== id),
          };
        }
      );

      return { previousUnread };
    },
    onError: (_err, _id, context) => {
      if (context?.previousUnread !== undefined) {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnread);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  // ─── SSE Stream Connection Manager ──────────────────────────────────────────
  useEffect(() => {
    const token = Cookies.get('epicclub_session');
    const isMockToken = token?.startsWith('mock_token_');

    if (!isAuthenticated || !user || isMockToken) {
      // Clean up connection if user logs out or has a mock token
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setSseConnected(false);
      }
      return;
    }

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Build URL with fresh token every connection attempt
      const streamUrl = getStreamUrl();
      // EventSource does not support headers; token is in the query string
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
        reconnectDelayRef.current = 1000; // Reset exponential backoff delay on success
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      es.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          
          // Ignore system connection verification or disconnection events
          if (!notification.id && (notification as any).message) {
            return;
          }

          // Trigger sound and toast
          playNotificationSound();
          addToast({
            type: notification.type,
            title: notification.title,
            body: notification.body,
            metadata: notification.metadata,
          });

          // Invalidate cache to refetch latest feed and unread count
          queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        } catch (err) {
          console.error('[SSE] Failed to parse event data:', err);
        }
      };

      es.onerror = () => {
        setSseConnected(false);
        es.close();

        // Before reconnecting, verify we still have a valid (non-mock) token.
        // This prevents an infinite 401 retry loop when the session has expired
        // or the user is in mock/bypass mode.
        const currentToken = Cookies.get('epicclub_session');
        if (!currentToken || currentToken.startsWith('mock_token_')) {
          console.warn('[SSE] Aborting reconnect — no valid session token.');
          return;
        }

        // Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s ... max 30s)
        const nextDelay = Math.min(reconnectDelayRef.current * 2, 30000);
        reconnectDelayRef.current = nextDelay;

        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, reconnectDelayRef.current);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setSseConnected(false);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user, queryClient, addToast, setSseConnected]);

  return {
    notifications: notificationsQuery.data?.notifications || [],
    pagination: notificationsQuery.data?.pagination,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    refetch: notificationsQuery.refetch,
    unreadCount: unreadCountQuery.data || 0,
    isLoadingUnread: unreadCountQuery.isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
