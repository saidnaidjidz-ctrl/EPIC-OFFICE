import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole } from '@/types';

// ─── State Interface ──────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setUser: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  updateUser: (updates: Partial<User>) => void;

  // Selectors (computed helpers — not pure derived state to avoid re-renders)
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  isPresident: () => boolean;
  isLeader: () => boolean;
  isMember: () => boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: false,

        // ── Actions ──────────────────────────────────────────────────────────

        setUser: (user: User) =>
          set({ user, isAuthenticated: true, isLoading: false }, false, 'auth/setUser'),

        logout: () =>
          set(
            { user: null, isAuthenticated: false, isLoading: false },
            false,
            'auth/logout'
          ),

        setLoading: (loading: boolean) =>
          set({ isLoading: loading }, false, 'auth/setLoading'),

        setInitialized: (initialized: boolean) =>
          set({ isInitialized: initialized }, false, 'auth/setInitialized'),

        updateUser: (updates: Partial<User>) =>
          set(
            (state) => ({
              user: state.user ? { ...state.user, ...updates } : null,
            }),
            false,
            'auth/updateUser'
          ),

        // ── Selectors ────────────────────────────────────────────────────────

        hasRole: (roles: UserRole | UserRole[]) => {
          const { user } = get();
          if (!user) return false;
          const roleArray = Array.isArray(roles) ? roles : [roles];
          return roleArray.includes(user.role);
        },

        isPresident: () => get().user?.role === 'president',

        isLeader: () =>
          get().user?.role === 'committee_leader' ||
          get().user?.role === 'president',

        isMember: () => !!get().user,
      }),
      {
        name: 'epicclub-auth',
        // Store only non-sensitive user info — token stays in httpOnly cookie
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'AuthStore' }
  )
);

// ─── Auth API Actions (use inside components via React Query or useEffect) ─────

export const authActions = {
  /**
   * Called after successful login — sets user in store.
   * Token stays in httpOnly cookie, we only keep user profile in store.
   */
  onLoginSuccess: (user: User) => {
    useAuthStore.getState().setUser(user);
  },

  /**
   * Called on logout — clears store. Backend should also clear the cookie.
   */
  onLogout: () => {
    useAuthStore.getState().logout();
  },

  /**
   * Hydrate store from /auth/me on app init.
   */
  onRestore: (user: User) => {
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setInitialized(true);
  },

  /**
   * Called when /auth/me fails (no valid session).
   */
  onRestoreFailed: () => {
    useAuthStore.getState().logout();
    useAuthStore.getState().setInitialized(true);
  },
};
