import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { NotificationType } from '@/types';

export interface Toast {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
}

interface NotificationState {
  toasts: Toast[];
  isSseConnected: boolean;

  // Actions
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setSseConnected: (connected: boolean) => void;
  clearAllToasts: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      toasts: [],
      isSseConnected: false,

      addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { ...toast, id };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }), false, 'notifications/addToast');

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }), false, 'notifications/autoDismiss');
        }, 5000);
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }), false, 'notifications/removeToast'),

      setSseConnected: (connected) =>
        set({ isSseConnected: connected }, false, 'notifications/setSseConnected'),

      clearAllToasts: () =>
        set({ toasts: [] }, false, 'notifications/clearAllToasts'),
    }),
    { name: 'NotificationStore' }
  )
);
