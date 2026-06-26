const db = require('../../config/db');
const redis = require('../../config/redis');

class DashboardService {
  /**
   * Helper to retrieve active cache client (real Redis or in-memory fallback).
   */
  _getCacheClient() {
    return redis.getRedisClient();
  }

  /**
   * Resolves the current cache version key.
   */
  async _getCacheVersion() {
    const client = this._getCacheClient();
    try {
      let version = await client.get('dashboard:version');
      if (!version) {
        version = '1';
        await client.set('dashboard:version', version);
      }
      return version;
    } catch (err) {
      console.error('[Dashboard Service] Failed to get cache version:', err.message);
      return 'fallback';
    }
  }

  /**
   * Resolves cached value.
   */
  async getCached(key) {
    const client = this._getCacheClient();
    try {
      const version = await this._getCacheVersion();
      const versionedKey = `dashboard:v${version}:${key}`;
      const val = await client.get(versionedKey);
      if (val) {
        return JSON.parse(val);
      }
    } catch (err) {
      console.error('[Dashboard Service] Cache read error:', err.message);
    }
    return null;
  }

  /**
   * Saves data to Redis cache with standard 60-second TTL.
   */
  async setCached(key, data, ttl = 60) {
    const client = this._getCacheClient();
    try {
      const version = await this._getCacheVersion();
      const versionedKey = `dashboard:v${version}:${key}`;
      await client.set(versionedKey, JSON.stringify(data), 'EX', ttl);
    } catch (err) {
      console.error('[Dashboard Service] Cache write error:', err.message);
    }
  }

  /**
   * Increments global dashboard:version key to invalidate all cache entries in O(1).
   */
  async invalidateDashboardCache() {
    const client = this._getCacheClient();
    try {
      await client.incr('dashboard:version');
      console.log('[Dashboard Cache] Dashboard cache version incremented (invalidation succeeded).');
    } catch (err) {
      console.error('[Dashboard Cache] Cache invalidation failed:', err.message);
    }
  }

  /**
   * Compiles president dashboard statistics.
   */
  async getPresidentStats() {
    // 1. Fetch Users summary
    const usersRes = await db.query(
      `SELECT 
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
       FROM users 
       WHERE deleted_at IS NULL`
    );
    const usersSummary = usersRes.rows[0];

    // 2. Fetch Users by Committee counts
    const committeeUsersRes = await db.query(
      `SELECT c.name, COUNT(u.id)::int AS count
       FROM committees c
       LEFT JOIN users u ON u.committee_id = c.id AND u.deleted_at IS NULL AND u.status = 'approved'
       GROUP BY c.id, c.name
       ORDER BY count DESC`
    );
    const byCommittee = {};
    committeeUsersRes.rows.forEach((row) => {
      byCommittee[row.name] = row.count;
    });

    // 3. Fetch Tasks summary
    const tasksRes = await db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed')::int AS overdue
       FROM tasks 
       WHERE deleted_at IS NULL`
    );
    const tasks = tasksRes.rows[0];
    const completionRate = tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0;

    // 4. Fetch Committees count and activity status (CTE ranked by task counts)
    const commCountRes = await db.query('SELECT COUNT(*)::int FROM committees');
    const commCount = commCountRes.rows[0].count;

    const commActivityRes = await db.query(
      `WITH committee_activity AS (
         SELECT 
           c.name, 
           COUNT(t.id)::int AS task_count
         FROM committees c
         LEFT JOIN tasks t ON t.committee_id = c.id AND t.deleted_at IS NULL
         GROUP BY c.id, c.name
       )
       SELECT name, task_count FROM committee_activity ORDER BY task_count DESC`
    );
    const mostActive = commActivityRes.rowCount > 0 ? commActivityRes.rows[0].name : null;
    const leastActive = commActivityRes.rowCount > 0 ? commActivityRes.rows[commActivityRes.rowCount - 1].name : null;

    // 5. Fetch Meetings metrics
    const meetingsRes = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE scheduled_at > NOW())::int AS upcoming_count,
         COUNT(*) FILTER (
           WHERE scheduled_at >= DATE_TRUNC('week', NOW()) 
             AND scheduled_at < DATE_TRUNC('week', NOW()) + INTERVAL '1 week'
         )::int AS this_week
       FROM meetings`
    );
    const meetings = meetingsRes.rows[0];

    // 6. Fetch Recent activity logs
    const activityRes = await db.query(
      `SELECT a.id, a.action, a.details, a.ip_address, a.created_at,
              u.name AS performer_name, t.name AS target_name
       FROM audit_logs a
       LEFT JOIN users u ON a.performed_by = u.id
       LEFT JOIN users t ON a.target_user_id = t.id
       ORDER BY a.created_at DESC
       LIMIT 10`
    );

    return {
      users: {
        total: usersSummary.total,
        pending: usersSummary.pending,
        approved: usersSummary.approved,
        by_committee: byCommittee,
      },
      tasks: {
        total: tasks.total,
        pending: tasks.pending,
        in_progress: tasks.in_progress,
        completed: tasks.completed,
        overdue: tasks.overdue,
        completion_rate: completionRate,
      },
      committees: {
        total: commCount,
        most_active: mostActive,
        least_active: leastActive,
      },
      meetings: {
        upcoming_count: meetings.upcoming_count,
        this_week: meetings.this_week,
      },
      recent_activity: activityRes.rows,
    };
  }

  /**
   * Compiles committee leader stats scoped to their committee.
   */
  async getLeaderStats(committeeId, userId) {
    // 1. Fetch Members counts
    const membersRes = await db.query(
      `SELECT 
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS active
       FROM users 
       WHERE committee_id = $1 AND deleted_at IS NULL`,
      [committeeId]
    );
    const members = membersRes.rows[0];

    // 2. Fetch Tasks count for the committee
    const tasksRes = await db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed')::int AS overdue
       FROM tasks 
       WHERE committee_id = $1 AND deleted_at IS NULL`,
      [committeeId]
    );
    const tasks = tasksRes.rows[0];
    const completionRate = tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0;

    // 3. Fetch Upcoming Meetings created by leader or involving committee attendees
    const meetingsRes = await db.query(
      `SELECT DISTINCT m.id, m.title, m.description, m.scheduled_at, m.location, m.meeting_link,
                      u.name AS creator_name
       FROM meetings m
       LEFT JOIN users u ON m.created_by = u.id
       LEFT JOIN meeting_attendees ma ON ma.meeting_id = m.id
       LEFT JOIN users att ON att.id = ma.user_id
       WHERE m.scheduled_at > NOW()
         AND (m.created_by = $1 OR att.committee_id = $2)
       ORDER BY m.scheduled_at ASC
       LIMIT 5`,
      [userId, committeeId]
    );

    // 4. Fetch Member performance breakdown
    const performanceRes = await db.query(
      `SELECT 
         u.id AS user_id, 
         u.name,
         COUNT(t.id)::int AS tasks_total,
         COUNT(t.id) FILTER (WHERE t.status = 'completed')::int AS tasks_completed
       FROM users u
       LEFT JOIN tasks t ON t.assigned_to = u.id AND t.deleted_at IS NULL
       WHERE u.committee_id = $1 AND u.status = 'approved' AND u.deleted_at IS NULL
       GROUP BY u.id, u.name
       ORDER BY tasks_completed DESC, u.name ASC`,
      [committeeId]
    );

    return {
      members: {
        total: members.total,
        active: members.active,
      },
      tasks: {
        total: tasks.total,
        pending: tasks.pending,
        in_progress: tasks.in_progress,
        completed: tasks.completed,
        overdue: tasks.overdue,
        completion_rate: completionRate,
      },
      upcoming_meetings: meetingsRes.rows,
      member_performance: performanceRes.rows,
    };
  }

  /**
   * Compiles statistics scoped to a single member.
   */
  async getMemberStats(userId) {
    // 1. Fetch personal Tasks metrics
    const tasksRes = await db.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM tasks
       WHERE assigned_to = $1 AND deleted_at IS NULL`,
      [userId]
    );
    const tasks = tasksRes.rows[0];
    const completionRate = tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0;

    // 2. Fetch member's upcoming Meetings RSVP (next 3)
    const meetingsRes = await db.query(
      `SELECT m.id, m.title, m.description, m.scheduled_at, m.location, m.meeting_link,
              u.name AS creator_name
       FROM meetings m
       JOIN meeting_attendees ma ON ma.meeting_id = m.id
       LEFT JOIN users u ON m.created_by = u.id
       WHERE ma.user_id = $1 AND m.scheduled_at > NOW()
       ORDER BY m.scheduled_at ASC
       LIMIT 3`,
      [userId]
    );

    // 3. Fetch recent notifications (last 5)
    const notificationsRes = await db.query(
      `SELECT id, type, title, body, is_read, metadata, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    return {
      my_tasks: {
        total: tasks.total,
        pending: tasks.pending,
        in_progress: tasks.in_progress,
        completed: tasks.completed,
      },
      upcoming_meetings: meetingsRes.rows,
      recent_notifications: notificationsRes.rows,
      completion_rate: completionRate,
    };
  }

  /**
   * Retrieves paginated activity feed. Scopes results according to roles.
   */
  async getActivityFeed(user, { page = 1, limit = 20 } = {}) {
    const activeLimit = Math.max(1, Math.min(20, parseInt(limit, 10) || 20));
    const offset = (Math.max(1, parseInt(page, 10) || 1) - 1) * activeLimit;

    if (user.role === 'president') {
      const countRes = await db.query('SELECT COUNT(*)::int FROM audit_logs');
      const total = countRes.rows[0].count;

      const logsRes = await db.query(
        `SELECT a.id, a.action, a.details, a.ip_address, a.created_at,
                u.name AS performer_name, t.name AS target_name
         FROM audit_logs a
         LEFT JOIN users u ON a.performed_by = u.id
         LEFT JOIN users t ON a.target_user_id = t.id
         ORDER BY a.created_at DESC
         LIMIT $1 OFFSET $2`,
        [activeLimit, offset]
      );

      return {
        activities: logsRes.rows,
        pagination: {
          total,
          page,
          limit: activeLimit,
          totalPages: Math.ceil(total / activeLimit) || 1,
        },
      };
    } else {
      // Leader/Member scope: only activities involving users in their committee
      const committeeId = user.committeeId;
      if (!committeeId) {
        return {
          activities: [],
          pagination: { total: 0, page, limit: activeLimit, totalPages: 1 },
        };
      }

      const countRes = await db.query(
        `SELECT COUNT(*)::int 
         FROM audit_logs a
         LEFT JOIN users u ON a.performed_by = u.id
         LEFT JOIN users t ON a.target_user_id = t.id
         WHERE u.committee_id = $1 OR t.committee_id = $1`,
        [committeeId]
      );
      const total = countRes.rows[0].count;

      const logsRes = await db.query(
        `SELECT a.id, a.action, a.details, a.ip_address, a.created_at,
                u.name AS performer_name, t.name AS target_name
         FROM audit_logs a
         LEFT JOIN users u ON a.performed_by = u.id
         LEFT JOIN users t ON a.target_user_id = t.id
         WHERE u.committee_id = $1 OR t.committee_id = $1
         ORDER BY a.created_at DESC
         LIMIT $2 OFFSET $3`,
        [committeeId, activeLimit, offset]
      );

      return {
        activities: logsRes.rows,
        pagination: {
          total,
          page,
          limit: activeLimit,
          totalPages: Math.ceil(total / activeLimit) || 1,
        },
      };
    }
  }

  /**
   * Compiles detailed performance metrics for all approved committee members.
   */
  async getCommitteePerformance(committeeId) {
    const res = await db.query(
      `SELECT 
         u.id AS user_id, 
         u.name, 
         u.email,
         COUNT(t.id)::int AS total_tasks,
         COUNT(t.id) FILTER (WHERE t.status = 'completed')::int AS completed_tasks,
         COUNT(t.id) FILTER (WHERE t.due_date < NOW() AND t.status != 'completed')::int AS overdue_tasks
       FROM users u
       LEFT JOIN tasks t ON t.assigned_to = u.id AND t.deleted_at IS NULL
       WHERE u.committee_id = $1 AND u.status = 'approved' AND u.deleted_at IS NULL
       GROUP BY u.id, u.name, u.email
       ORDER BY completed_tasks DESC, u.name ASC`,
      [committeeId]
    );

    return res.rows.map((row) => ({
      user_id: row.user_id,
      name: row.name,
      email: row.email,
      total_tasks: row.total_tasks,
      completed_tasks: row.completed_tasks,
      overdue_tasks: row.overdue_tasks,
      completion_rate: row.total_tasks > 0 ? Math.round((row.completed_tasks / row.total_tasks) * 100) : 0,
    }));
  }
}

module.exports = new DashboardService();
