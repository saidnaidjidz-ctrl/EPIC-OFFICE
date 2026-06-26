// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'president' | 'committee_leader' | 'member';
export type UserStatus = 'pending_verification' | 'pending' | 'approved' | 'rejected' | 'suspended';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'task_status_changed'
  | 'meeting_scheduled'
  | 'meeting_updated'
  | 'meeting_cancelled'
  | 'committee_assigned'
  | 'role_changed'
  | 'member_approved'
  | 'member_rejected'
  | 'admin_broadcast'
  | 'system';

export type AttendanceStatus = 'pending' | 'accepted' | 'declined' | 'attended' | 'absent';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  committee_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends User {
  /** Present only on login response, not stored in client state */
  access_token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// ─── Committee ────────────────────────────────────────────────────────────────

export interface Committee {
  id: string;
  name: string;
  description: string | null;
  leader_id: string;
  leader?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'>;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommitteeDetail extends Committee {
  members: Pick<User, 'id' | 'name' | 'email' | 'role' | 'avatar_url'>[];
  task_stats: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
  recent_tasks: Task[];
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string | null;
  committee_id: string;
  committee?: Pick<Committee, 'id' | 'name'>;
  assigned_to: string;
  assignee?: Pick<User, 'id' | 'name' | 'avatar_url'>;
  created_by: string;
  creator?: Pick<User, 'id' | 'name'>;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  committee_id: string;
  assigned_to: string;
  priority: TaskPriority;
  start_date?: string;
  due_date?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  start_date?: string;
  due_date?: string;
  assigned_to?: string;
}

// ─── Meeting ──────────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string | null;
  meeting_link: string | null;
  committee_id: string | null;
  committee?: Pick<Committee, 'id' | 'name'>;
  created_by: string;
  creator?: Pick<User, 'id' | 'name'>;
  attendee_count: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingDetail extends Meeting {
  attendees: (Pick<User, 'id' | 'name' | 'email' | 'avatar_url'> & {
    attendance_status: AttendanceStatus;
  })[];
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  scheduled_at: string;
  location?: string;
  meeting_link?: string;
  attendees: string[];
  committee_id?: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

// ─── Dashboard / Analytics ────────────────────────────────────────────────────

export interface PresidentDashboard {
  users: {
    total: number;
    pending: number;
    approved: number;
    by_committee: Record<string, number>;
  };
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
    completion_rate: number;
  };
  committees: {
    total: number;
    most_active: string | null;
    least_active: string | null;
  };
  meetings: {
    upcoming_count: number;
    this_week: number;
  };
  recent_activity: AuditEntry[];
}

export interface LeaderDashboard {
  members: { total: number; active: number };
  tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
    completion_rate: number;
  };
  upcoming_meetings: Meeting[];
  member_performance: {
    user_id: string;
    name: string;
    tasks_completed: number;
    tasks_total: number;
  }[];
}

export interface MemberDashboard {
  my_tasks: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
  upcoming_meetings: Meeting[];
  recent_notifications: Notification[];
}

export interface AuditEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
  code?: string;
}
