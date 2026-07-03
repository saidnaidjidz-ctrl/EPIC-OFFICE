import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// ─── Constants ────────────────────────────────────────────────────────────────

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,          // Always send httpOnly cookies
  timeout: 60_000,                // 60s to handle Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
// Attaches CSRF token and JWT access token if present

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Read CSRF token from meta tag (set by SSR layout)
    if (typeof document !== 'undefined') {
      const csrfToken = document
        .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
        ?.getAttribute('content');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    // Attach Bearer Access Token if present
    const sessionToken = Cookies.get('epicclub_session');
    if (sessionToken) {
      config.headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
// Handles 401 → refresh → retry, and 403 → redirect

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  refreshQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      p.resolve();
    }
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ── 401 Unauthorized → try refresh ──────────────────────────────────────
    // Skip refresh/logout entirely for mock-mode sessions — the backend will
    // always reject mock_token_* with 401; we let the catch block fall through
    // to the client-side mock handler instead.
    const sessionCookie = Cookies.get('epicclub_session');
    const isMockSession = sessionCookie?.startsWith('mock_token_');

    if (
      error.response?.status === 401 &&
      !isMockSession &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = Cookies.get('epicclub_refresh');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call backend refresh endpoint with the refresh token in the body
        const res = await axios.post<{
          success: boolean;
          tokens: { accessToken: string; refreshToken: string };
        }>(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { withCredentials: true }
        );

        const newTokens = res.data.tokens;
        const cookieOpts: Cookies.CookieAttributes = {
          expires: 1 / 96, // 15 min
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        };
        Cookies.set('epicclub_session', newTokens.accessToken, cookieOpts);
        Cookies.set('epicclub_refresh', newTokens.refreshToken, {
          expires: 7, // 7 days
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
        });

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed — clear auth state and redirect to login
        if (typeof window !== 'undefined') {
          const { useAuthStore } = await import('@/store/authStore');
          useAuthStore.getState().logout();
          if (!originalRequest.url?.includes('/auth/me') && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?session=expired';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403 Forbidden ────────────────────────────────────────────────────────
    if (error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        window.location.href = '/403';
      }
    }

    // ── Normalize error shape ────────────────────────────────────────────────
    const apiError = {
      message:
        (error.response?.data as { message?: string })?.message ||
        error.message ||
        'An unexpected error occurred',
      status: error.response?.status,
      errors: (error.response?.data as { errors?: unknown[] })?.errors,
      code: (error.response?.data as { code?: string })?.code,
    };

    return Promise.reject(apiError);
  }
);

// ─── HIGH-FIDELITY CLIENT-SIDE MOCK DATABASE ─────────────────────────────────
// Ensures the application is fully interactive and functional when backend is down.

interface MockCommittee {
  id: string;
  name: string;
  description: string;
  color: string;
  leader: { name: string; avatarUrl: string; email: string };
  stats: { members: number; tasks: number; completion: number };
  recent_tasks: any[];
  upcoming_meetings: any[];
  members: any[];
}

interface MockTask {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  committee_id: string;
  committeeName?: string;
  assigned_to: string;
  assignee?: { name: string; avatarUrl: string };
  due_date: string;
  created_at: string;
}

const initializeMockDb = () => {
  if (typeof window === 'undefined') return null;

  const getOrSet = (key: string, initial: any) => {
    const val = sessionStorage.getItem(key);
    if (val) return JSON.parse(val);
    sessionStorage.setItem(key, JSON.stringify(initial));
    return initial;
  };

  const committees: MockCommittee[] = getOrSet('epic_mock_committees', [
    {
      id: 'mock-committee-tech',
      name: 'Technical Committee',
      description: 'Manages website infrastructure, code deployments, and software updates.',
      color: '#3B82F6', // Blue
      leader: { name: 'Sarah Connor', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', email: 'sarah@epicclub.com' },
      stats: { members: 8, tasks: 5, completion: 60 },
      recent_tasks: [],
      upcoming_meetings: [
        { id: 'm1', title: 'Code Architecture Sync', scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(), location: 'Conference Room A' }
      ],
      members: [
        { id: 'm-u1', name: 'Sarah Connor', role: 'committee_leader', joined_at: '2026-01-10', tasks_count: 3 },
        { id: 'm-u2', name: 'John Doe', role: 'member', joined_at: '2026-02-15', tasks_count: 2 }
      ]
    },
    {
      id: 'mock-committee-social',
      name: 'Social Committee',
      description: 'Coordinates social meetups, networking events, and holiday parties.',
      color: '#F59E0B', // Amber
      leader: { name: 'Michael Scott', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', email: 'michael@epicclub.com' },
      stats: { members: 12, tasks: 4, completion: 50 },
      recent_tasks: [],
      upcoming_meetings: [],
      members: []
    },
    {
      id: 'mock-committee-sports',
      name: 'Sports & Wellness',
      description: 'Arranges local tournaments, football matches, and gym memberships.',
      color: '#10B981', // Emerald
      leader: { name: 'Ted Lasso', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', email: 'ted@epicclub.com' },
      stats: { members: 6, tasks: 3, completion: 33 },
      recent_tasks: [],
      upcoming_meetings: [],
      members: []
    }
  ]);

  const tasks: MockTask[] = getOrSet('epic_mock_tasks', [
    {
      id: 'task-1',
      title: 'Prepare Annual Budget Proposal',
      description: 'Draft the layout for next year\'s event funding and sponsor fees.',
      priority: 'urgent',
      status: 'pending',
      committee_id: 'mock-committee-tech',
      assigned_to: 'mock-leader',
      assignee: { name: 'Sarah Connor', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
      due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'task-2',
      title: 'Configure Production Docker Stack',
      description: 'Set up reverse proxies, rate limiters, and deploy the compose stack.',
      priority: 'high',
      status: 'in_progress',
      committee_id: 'mock-committee-tech',
      assigned_to: 'mock-president',
      assignee: { name: 'President Demo', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80' },
      due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 'task-3',
      title: 'Confirm Event Venue Catering',
      description: 'Call vendors to lock down menu selections and drinks options.',
      priority: 'medium',
      status: 'completed',
      committee_id: 'mock-committee-social',
      assigned_to: 'mock-member',
      assignee: { name: 'John Doe', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80' },
      due_date: new Date(Date.now() - 86400000 * 2).toISOString(),
      created_at: new Date().toISOString()
    }
  ]);

  const notifications = getOrSet('epic_mock_notifications', [
    {
      id: 'notif-1',
      title: 'New Committee Task Assigned',
      body: 'You have been assigned to: "Prepare Annual Budget Proposal". Please check deadlines.',
      type: 'task_assigned',
      is_read: false,
      created_at: new Date(Date.now() - 600000).toISOString() // 10m ago
    },
    {
      id: 'notif-2',
      title: 'General Meeting Scheduled',
      body: 'Upcoming sync scheduled for Technical Committee: "Code Architecture Sync".',
      type: 'meeting_scheduled',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString() // 2h ago
    }
  ]);

  return {
    getCommittees: () => {
      const comms = JSON.parse(sessionStorage.getItem('epic_mock_committees') || '[]');
      const tskList = JSON.parse(sessionStorage.getItem('epic_mock_tasks') || '[]');
      return comms.map((c: MockCommittee) => {
        const commTasks = tskList.filter((t: MockTask) => t.committee_id === c.id);
        const completed = commTasks.filter((t: MockTask) => t.status === 'completed').length;
        const total = commTasks.length;
        return {
          ...c,
          stats: {
            members: c.members.length || 5,
            tasks: total,
            completion: total > 0 ? Math.round((completed / total) * 100) : 0
          },
          recent_tasks: commTasks.slice(0, 5)
        };
      });
    },
    saveCommittees: (comms: any) => sessionStorage.setItem('epic_mock_committees', JSON.stringify(comms)),

    getTasks: () => {
      const tskList = JSON.parse(sessionStorage.getItem('epic_mock_tasks') || '[]');
      const comms = JSON.parse(sessionStorage.getItem('epic_mock_committees') || '[]');
      return tskList.map((t: MockTask) => ({
        ...t,
        committeeName: comms.find((c: any) => c.id === t.committee_id)?.name || 'General'
      }));
    },
    saveTasks: (tsks: any) => sessionStorage.setItem('epic_mock_tasks', JSON.stringify(tsks)),

    getNotifications: () => JSON.parse(sessionStorage.getItem('epic_mock_notifications') || '[]'),
    saveNotifications: (notifs: any) => sessionStorage.setItem('epic_mock_notifications', JSON.stringify(notifs))
  };
};

const handleMockRequest = async (method: string, url: string, data?: any): Promise<any> => {
  const db = initializeMockDb();
  if (!db) return null;

  // Simulate minimal server delay
  await new Promise((r) => setTimeout(r, 200));

  // ── Auth me ──
  if (url.includes('/auth/me')) {
    const role = typeof window !== 'undefined' ? (document.cookie.split('; ').find(row => row.startsWith('epicclub_role='))?.split('=')[1] || 'member') : 'member';
    return {
      success: true,
      user: {
        id: `mock-${role}`,
        email: `${role}@epicclub.com`,
        name: `${role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')} Demo`,
        role: role,
        status: 'approved',
        committeeId: 'mock-committee-tech',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString()
      }
    };
  }

  // ── Auth Google login ──
  if (url.includes('/auth/google') && method === 'POST') {
    return {
      success: true,
      tokens: { accessToken: 'mock_token_president', refreshToken: 'mock_refresh' },
      user: {
        id: 'mock-president',
        email: 'president@epicclub.com',
        name: 'President Demo',
        role: 'president',
        status: 'approved',
        committeeId: 'mock-committee-tech',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString()
      }
    };
  }

  // ── Auth credentials login ──
  if (url.includes('/auth/login') && method === 'POST') {
    const { email, password } = data || {};
    const users = JSON.parse(sessionStorage.getItem('epic_mock_users') || '[]');
    const found = users.find((u: any) => u.email === email && u.password === password);

    if (found) {
      return {
        success: true,
        tokens: { accessToken: 'mock_token_' + found.role, refreshToken: 'mock_refresh' },
        user: {
          id: found.id,
          email: found.email,
          name: found.name,
          role: found.role,
          committeeId: found.committeeId,
          status: found.status
        }
      };
    }

    // Default accounts bypass
    if (
      email === 'president@epicclub.com' ||
      email === 'leader@epicclub.com' ||
      email === 'member@epicclub.com' ||
      (email === 'teamepiclub@gmail.com' && password === 'Epicclub123')
    ) {
      const role = email === 'teamepiclub@gmail.com' 
        ? 'president' 
        : (email.split('@')[0] === 'leader' ? 'committee_leader' : email.split('@')[0]);
      return {
        success: true,
        tokens: { accessToken: 'mock_token_' + role, refreshToken: 'mock_refresh' },
        user: {
          id: `mock-${role}`,
          email,
          name: email === 'teamepiclub@gmail.com' ? 'Epic President' : `${role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')} Demo`,
          role,
          status: 'approved',
          committeeId: 'mock-committee-tech'
        }
      };
    }

    throw {
      message: 'Invalid email or password',
      status: 401
    };
  }

  // ── Auth credentials register ──
  if (url.includes('/auth/register') && method === 'POST') {
    const { name, email, password } = data || {};
    const users = JSON.parse(sessionStorage.getItem('epic_mock_users') || '[]');

    if (users.some((u: any) => u.email === email)) {
      throw {
        message: 'Email address already registered',
        status: 400
      };
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      password,
      role: users.length === 0 ? 'president' : 'member',
      status: users.length === 0 ? 'approved' : 'pending',
      committeeId: null,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    sessionStorage.setItem('epic_mock_users', JSON.stringify(users));

    if (newUser.status === 'pending') {
      return {
        success: true,
        status: 'pending',
        message: 'Registration successful. Awaiting admin approval.',
        user: newUser
      };
    }

    return {
      success: true,
      tokens: { accessToken: 'mock_token_president', refreshToken: 'mock_refresh' },
      user: newUser
    };
  }

  // ── Dashboard Stats ──
  if (url.includes('/dashboard/stats')) {
    const tasksList = db.getTasks();
    const commList = db.getCommittees();
    const notifs = db.getNotifications();
    const role = typeof window !== 'undefined'
      ? (document.cookie.split('; ').find((r: string) => r.startsWith('epicclub_role='))?.split('=')[1] || 'member')
      : 'member';

    const pending = tasksList.filter((t: any) => t.status === 'pending').length;
    const inProgress = tasksList.filter((t: any) => t.status === 'in_progress').length;
    const done = tasksList.filter((t: any) => t.status === 'completed').length;
    const completionRate = tasksList.length > 0 ? Math.round((done / tasksList.length) * 100) : 0;

    const upcomingMeetings = [{
      id: 'm-sync',
      title: 'Epic Club General Sync',
      description: 'Monthly all-hands meeting',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      location: 'Conference Room A',
      meeting_link: null,
      committee_id: null,
      created_by: 'mock-president',
      attendee_count: 12,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }];

    const recentActivity = [
      { id: 'act1', user_id: 'mock-president', user_name: 'President Demo', action: 'task_updated', entity_type: 'task', entity_id: 'task-1', changes: { status: 'in_progress' }, created_at: new Date(Date.now() - 300000).toISOString() },
      { id: 'act2', user_id: 'mock-leader', user_name: 'Leader Demo', action: 'meeting_scheduled', entity_type: 'meeting', entity_id: 'm-sync', changes: null, created_at: new Date(Date.now() - 3600000).toISOString() },
    ];

    if (role === 'president') {
      const byCommittee: Record<string, number> = {};
      commList.forEach((c: any) => { byCommittee[c.name] = c.members?.length || c.stats?.members || 0; });
      return {
        success: true,
        data: {
          users: { total: 26, pending: 3, approved: 23, by_committee: byCommittee },
          tasks: { total: tasksList.length, pending, in_progress: inProgress, completed: done, overdue: 1, completion_rate: completionRate },
          committees: { total: commList.length, most_active: commList[0]?.name || null, least_active: commList[commList.length - 1]?.name || null },
          meetings: { upcoming_count: 1, this_week: 1 },
          recent_activity: recentActivity,
        }
      };
    }

    if (role === 'committee_leader') {
      return {
        success: true,
        data: {
          members: { total: 8, active: 6 },
          tasks: { total: tasksList.length, pending, in_progress: inProgress, completed: done, overdue: 1, completion_rate: completionRate },
          upcoming_meetings: upcomingMeetings,
          member_performance: [
            { user_id: 'mock-u1', name: 'Sarah Connor', tasks_completed: 5, tasks_total: 8 },
            { user_id: 'mock-u2', name: 'John Doe', tasks_completed: 3, tasks_total: 5 },
            { user_id: 'mock-u3', name: 'Alice Kim', tasks_completed: 7, tasks_total: 9 },
          ],
        }
      };
    }

    // member role
    return {
      success: true,
      data: {
        my_tasks: { total: tasksList.slice(0, 3).length, pending, in_progress: inProgress, completed: done, overdue: 0 },
        upcoming_meetings: upcomingMeetings,
        recent_notifications: notifs.slice(0, 5),
      }
    };
  }

  // ── Tasks ──
  if (url === '/tasks' || url.includes('/tasks?')) {
    if (method === 'GET') {
      return { success: true, data: db.getTasks() };
    }
    if (method === 'POST') {
      const currentTasks = db.getTasks();
      const newTask = {
        id: `task-${Date.now()}`,
        created_at: new Date().toISOString(),
        status: 'pending' as const,
        ...data,
        assignee: data.assigned_to ? { name: 'Demo Assignee', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80' } : undefined
      };
      db.saveTasks([newTask, ...currentTasks]);

      // Push a mock notification
      const notifs = db.getNotifications();
      db.saveNotifications([
        {
          id: `notif-${Date.now()}`,
          title: 'New Task Created',
          body: `Task "${newTask.title}" was added.`,
          type: 'task_created',
          is_read: false,
          created_at: new Date().toISOString()
        },
        ...notifs
      ]);

      return { success: true, data: newTask };
    }
  }

  if (url.startsWith('/tasks/')) {
    const id = url.split('/').pop()?.split('?')[0];
    const currentTasks = db.getTasks();
    if (method === 'PATCH') {
      const updated = currentTasks.map((t: any) => {
        if (t.id === id) {
          return { ...t, ...data };
        }
        return t;
      });
      db.saveTasks(updated);
      return { success: true, data: updated.find((t: any) => t.id === id) };
    }
    if (method === 'DELETE') {
      db.saveTasks(currentTasks.filter((t: any) => t.id !== id));
      return { success: true };
    }
  }

  // ── Committees ──
  if (url === '/committees' || url.includes('/committees?')) {
    if (method === 'GET') {
      return { success: true, data: db.getCommittees() };
    }
    if (method === 'POST') {
      const comms = db.getCommittees();
      const newComm = {
        id: `comm-${Date.now()}`,
        leader: { name: 'Demo Leader', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80', email: 'leader@epic.com' },
        stats: { members: 1, tasks: 0, completion: 0 },
        recent_tasks: [],
        upcoming_meetings: [],
        members: [{ id: 'm-new', name: 'Demo Leader', role: 'committee_leader', joined_at: new Date().toISOString(), tasks_count: 0 }],
        ...data
      };
      db.saveCommittees([...comms, newComm]);
      return { success: true, data: newComm };
    }
  }

  if (url.startsWith('/committees/')) {
    const id = url.split('/').pop();
    const comms = db.getCommittees();
    const found = comms.find((c: any) => c.id === id);
    if (found) {
      return { success: true, data: found };
    }
  }

  // ── Notifications ──
  if (url.includes('/notifications')) {
    const current = db.getNotifications();
    if (url.includes('/unread-count')) {
      const unreadCount = current.filter((n: any) => !n.is_read).length;
      return { success: true, unread_count: unreadCount };
    }
    if (url.includes('/read-all')) {
      const read = current.map((n: any) => ({ ...n, is_read: true }));
      db.saveNotifications(read);
      return { success: true };
    }
    if (url.match(/\/notifications\/[^/]+\/read/)) {
      const notifId = url.split('/')[2];
      const read = current.map((n: any) => n.id === notifId ? { ...n, is_read: true } : n);
      db.saveNotifications(read);
      return { success: true };
    }
    return { success: true, notifications: current, data: current };
  }

  return { success: true };
};

// ─── Typed Request Helpers ────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(url: string, params?: Record<string, unknown>): Promise<T> =>
    api.get<T>(url, { params }).then((r) => r.data).catch(async (err) => {
      console.warn(`⚠️ [API Client fallback] GET ${url} failed. Serving mock data...`, err);
      const res = await handleMockRequest('GET', url);
      if (res) return res as T;
      throw err;
    }),

  post: <T>(url: string, data?: unknown): Promise<T> =>
    api.post<T>(url, data).then((r) => r.data).catch(async (err) => {
      console.warn(`⚠️ [API Client fallback] POST ${url} failed. Serving mock data...`, err);
      const res = await handleMockRequest('POST', url, data);
      if (res) return res as T;
      throw err;
    }),

  patch: <T>(url: string, data?: unknown): Promise<T> =>
    api.patch<T>(url, data).then((r) => r.data).catch(async (err) => {
      console.warn(`⚠️ [API Client fallback] PATCH ${url} failed. Serving mock data...`, err);
      const res = await handleMockRequest('PATCH', url, data);
      if (res) return res as T;
      throw err;
    }),

  put: <T>(url: string, data?: unknown): Promise<T> =>
    api.put<T>(url, data).then((r) => r.data).catch(async (err) => {
      console.warn(`⚠️ [API Client fallback] PUT ${url} failed. Serving mock data...`, err);
      const res = await handleMockRequest('PUT', url, data);
      if (res) return res as T;
      throw err;
    }),

  delete: <T>(url: string): Promise<T> =>
    api.delete<T>(url).then((r) => r.data).catch(async (err) => {
      console.warn(`⚠️ [API Client fallback] DELETE ${url} failed. Serving mock data...`, err);
      const res = await handleMockRequest('DELETE', url);
      if (res) return res as T;
      throw err;
    }),
};

export default api;
