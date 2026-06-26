const db = require('../../config/db');

class CommitteesService {
  // ───────────────────────────────────────────────────────────────────────────
  // CREATE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Creates a committee inside a transaction.
   * If a leader_id is supplied the user must be approved;
   * their role is promoted to 'committee_leader' atomically.
   *
   * @param {object} data
   * @param {string} data.name
   * @param {string} [data.description]
   * @param {string} [data.leader_id]
   * @returns {Promise<object>} Created committee row
   */
  async createCommittee({ name, description, leader_id }) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Validate leader if provided
      if (leader_id) {
        const leaderRes = await client.query(
          `SELECT id, role FROM users
           WHERE id = $1 AND status = 'approved' AND deleted_at IS NULL`,
          [leader_id]
        );
        if (leaderRes.rowCount === 0) {
          throw Object.assign(
            new Error('Leader user not found or not approved'),
            { statusCode: 422 }
          );
        }
      }

      // Insert committee
      const insertRes = await client.query(
        `INSERT INTO committees (name, description, leader_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, description ?? null, leader_id ?? null]
      );
      const committee = insertRes.rows[0];

      // Promote leader's role
      if (leader_id) {
        await client.query(
          `UPDATE users
           SET role = 'committee_leader', committee_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [committee.id, leader_id]
        );
      }

      await client.query('COMMIT');

      // Invalidate dashboard cache
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});

      return committee;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // READ — LIST
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Returns all committees with member count, task stats, and leader info.
   * Single efficient query via CTEs — no N+1.
   *
   * @returns {Promise<Array>}
   */
  async getAllCommittees() {
    const res = await db.query(
      `SELECT
         c.id,
         c.name,
         c.description,
         c.leader_id,
         c.created_at,
         -- Leader info
         l.name              AS leader_name,
         l.email             AS leader_email,
         l.avatar_url        AS leader_avatar,
         -- Member count (approved, not deleted)
         COUNT(DISTINCT u.id)                                       AS member_count,
         -- Task stats
         COUNT(DISTINCT t.id)                                       AS task_total,
         COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') AS task_completed
       FROM committees c
       LEFT JOIN users      l ON c.leader_id   = l.id
       LEFT JOIN users      u ON u.committee_id = c.id
                              AND u.status = 'approved'
                              AND u.deleted_at IS NULL
       LEFT JOIN tasks      t ON t.committee_id = c.id
                              AND t.deleted_at IS NULL
       GROUP BY c.id, l.id
       ORDER BY c.name ASC`
    );
    return res.rows;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // READ — SINGLE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Returns detailed committee info: stats, leader, members list, recent tasks.
   *
   * @param {string} id - Committee UUID
   * @returns {Promise<object|null>}
   */
  async getCommitteeById(id) {
    // Core committee row + stats
    const committeeRes = await db.query(
      `SELECT
         c.id, c.name, c.description, c.leader_id, c.created_at,
         l.name       AS leader_name,
         l.email      AS leader_email,
         l.avatar_url AS leader_avatar,
         COUNT(DISTINCT u.id)                                       AS member_count,
         COUNT(DISTINCT t.id)                                       AS task_total,
         COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pending')   AS task_pending,
         COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') AS task_in_progress,
         COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') AS task_completed,
         COUNT(DISTINCT t.id) FILTER (
           WHERE t.due_date < NOW() AND t.status != 'completed'
         )                                                          AS task_overdue
       FROM committees c
       LEFT JOIN users  l ON c.leader_id   = l.id
       LEFT JOIN users  u ON u.committee_id = c.id
                         AND u.status = 'approved' AND u.deleted_at IS NULL
       LEFT JOIN tasks  t ON t.committee_id = c.id AND t.deleted_at IS NULL
       WHERE c.id = $1
       GROUP BY c.id, l.id`,
      [id]
    );

    if (committeeRes.rowCount === 0) return null;
    const committee = committeeRes.rows[0];

    // Members list (up to 50 for detail view)
    const membersRes = await db.query(
      `SELECT id, name, email, avatar_url, role, created_at
       FROM users
       WHERE committee_id = $1
         AND status = 'approved'
         AND deleted_at IS NULL
       ORDER BY name ASC
       LIMIT 50`,
      [id]
    );
    committee.members = membersRes.rows;

    // Recent tasks (last 10)
    const tasksRes = await db.query(
      `SELECT
         t.id, t.title, t.status, t.priority, t.due_date,
         u.name AS assignee_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.committee_id = $1 AND t.deleted_at IS NULL
       ORDER BY t.created_at DESC
       LIMIT 10`,
      [id]
    );
    committee.recent_tasks = tasksRes.rows;

    return committee;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Updates committee fields. When leader changes:
   *  - old leader → role = 'member'
   *  - new leader → role = 'committee_leader'
   *
   * @param {string} id  - Committee UUID
   * @param {object} payload - Fields to update
   * @returns {Promise<object>} Updated committee
   */
  async updateCommittee(id, payload) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Fetch current state
      const currentRes = await client.query(
        'SELECT id, leader_id FROM committees WHERE id = $1',
        [id]
      );
      if (currentRes.rowCount === 0) {
        throw Object.assign(new Error('Committee not found'), { statusCode: 404 });
      }
      const current = currentRes.rows[0];

      // Validate new leader if changing
      if (payload.leader_id && payload.leader_id !== current.leader_id) {
        const newLeaderRes = await client.query(
          `SELECT id FROM users
           WHERE id = $1 AND status = 'approved' AND deleted_at IS NULL`,
          [payload.leader_id]
        );
        if (newLeaderRes.rowCount === 0) {
          throw Object.assign(
            new Error('New leader not found or not approved'),
            { statusCode: 422 }
          );
        }

        // Demote old leader (if any and not also president)
        if (current.leader_id) {
          // Only demote if they don't lead another committee
          const otherRes = await client.query(
            'SELECT id FROM committees WHERE leader_id = $1 AND id != $2',
            [current.leader_id, id]
          );
          if (otherRes.rowCount === 0) {
            await client.query(
              `UPDATE users SET role = 'member', updated_at = NOW() WHERE id = $1`,
              [current.leader_id]
            );
          }
        }

        // Promote new leader
        await client.query(
          `UPDATE users
           SET role = 'committee_leader', committee_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [id, payload.leader_id]
        );
      }

      // Build parameterized SET clause — only update supplied fields
      const setEntries = [];
      const params = [];

      const FIELD_MAP = {
        name:        'name',
        description: 'description',
        leader_id:   'leader_id',
      };

      for (const [key, col] of Object.entries(FIELD_MAP)) {
        if (payload[key] !== undefined) {
          params.push(payload[key]);
          setEntries.push(`${col} = $${params.length}`);
        }
      }

      if (setEntries.length === 0) {
        await client.query('ROLLBACK');
        throw Object.assign(
          new Error('No valid fields provided for update'),
          { statusCode: 400 }
        );
      }

      params.push(id);
      const updateRes = await client.query(
        `UPDATE committees
         SET ${setEntries.join(', ')}
         WHERE id = $${params.length}
         RETURNING *`,
        params
      );

      await client.query('COMMIT');

      // Invalidate dashboard cache
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});

      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DELETE
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a committee if it has no active (non-completed) tasks.
   * Returns { blocked: true, tasks: [...] } when tasks exist.
   * Otherwise: nullifies members' committee_id, demotes leader, deletes.
   *
   * @param {string} id
   * @returns {Promise<{blocked: boolean, tasks?: Array, committee?: object}>}
   */
  async deleteCommittee(id) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Verify committee exists
      const committeeRes = await client.query(
        'SELECT id, leader_id FROM committees WHERE id = $1',
        [id]
      );
      if (committeeRes.rowCount === 0) {
        throw Object.assign(new Error('Committee not found'), { statusCode: 404 });
      }
      const committee = committeeRes.rows[0];

      // Check for blocking (non-completed) tasks
      const blockingRes = await client.query(
        `SELECT id, title, status, priority, due_date
         FROM tasks
         WHERE committee_id = $1
           AND status != 'completed'
           AND deleted_at IS NULL`,
        [id]
      );

      if (blockingRes.rowCount > 0) {
        await client.query('ROLLBACK');
        return { blocked: true, tasks: blockingRes.rows };
      }

      // Demote leader back to member
      if (committee.leader_id) {
        const otherRes = await client.query(
          'SELECT id FROM committees WHERE leader_id = $1 AND id != $2',
          [committee.leader_id, id]
        );
        if (otherRes.rowCount === 0) {
          await client.query(
            `UPDATE users SET role = 'member', updated_at = NOW() WHERE id = $1`,
            [committee.leader_id]
          );
        }
      }

      // Nullify all members' committee_id
      await client.query(
        `UPDATE users
         SET committee_id = NULL, updated_at = NOW()
         WHERE committee_id = $1`,
        [id]
      );

      // Delete the committee (tasks cascade via FK ON DELETE CASCADE)
      const deleteRes = await client.query(
        'DELETE FROM committees WHERE id = $1 RETURNING *',
        [id]
      );

      await client.query('COMMIT');

      // Invalidate dashboard cache
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});

      return { blocked: false, committee: deleteRes.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // MEMBERS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Returns paginated members of a committee.
   *
   * @param {string} committeeId
   * @param {number} page
   * @param {number} limit
   * @returns {Promise<{members: Array, pagination: object}>}
   */
  async getMembers(committeeId, page = 1, limit = 20) {
    const activeLimit = Math.min(Number(limit), 50);
    const offset = (Number(page) - 1) * activeLimit;

    const countRes = await db.query(
      `SELECT COUNT(*) FROM users
       WHERE committee_id = $1 AND status = 'approved' AND deleted_at IS NULL`,
      [committeeId]
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const membersRes = await db.query(
      `SELECT id, name, email, avatar_url, role, created_at
       FROM users
       WHERE committee_id = $1
         AND status = 'approved'
         AND deleted_at IS NULL
       ORDER BY role DESC, name ASC
       LIMIT $2 OFFSET $3`,
      [committeeId, activeLimit, offset]
    );

    return {
      members: membersRes.rows,
      pagination: {
        total,
        page: Number(page),
        limit: activeLimit,
        totalPages: Math.ceil(total / activeLimit) || 1,
      },
    };
  }

  /**
   * Adds an approved user to a committee (parameterized UPDATE).
   *
   * @param {string} committeeId
   * @param {string} userId
   * @returns {Promise<object>} Updated user stub
   */
  async addMember(committeeId, userId) {
    // Verify committee exists
    const commRes = await db.query(
      'SELECT id FROM committees WHERE id = $1',
      [committeeId]
    );
    if (commRes.rowCount === 0) {
      throw Object.assign(new Error('Committee not found'), { statusCode: 404 });
    }

    // Verify user exists and is approved
    const userRes = await db.query(
      `SELECT id, committee_id FROM users
       WHERE id = $1 AND status = 'approved' AND deleted_at IS NULL`,
      [userId]
    );
    if (userRes.rowCount === 0) {
      throw Object.assign(
        new Error('User not found or not approved'),
        { statusCode: 422 }
      );
    }

    const res = await db.query(
      `UPDATE users
       SET committee_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email, role, committee_id`,
      [committeeId, userId]
    );

    // Trigger notification
    try {
      const notificationsService = require('../notifications/notifications.service');
      await notificationsService.createNotification(
        userId,
        'committee_assigned',
        'Assigned to Committee',
        `You have been assigned to a committee.`,
        { committeeId }
      );
    } catch (err) {
      console.error('[Committees Service] Failed to send committee_assigned notification:', err.message);
    }

    // Invalidate dashboard cache
    const dashboardService = require('../dashboard/dashboard.service');
    dashboardService.invalidateDashboardCache().catch(() => {});

    return res.rows[0];
  }

  /**
   * Removes a user from a committee (sets committee_id to NULL).
   * Also demotes role from committee_leader to member if they were the leader.
   *
   * @param {string} committeeId
   * @param {string} userId
   * @returns {Promise<object>} Updated user stub
   */
  async removeMember(committeeId, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query(
        `SELECT id, role FROM users
         WHERE id = $1 AND committee_id = $2 AND deleted_at IS NULL`,
        [userId, committeeId]
      );
      if (userRes.rowCount === 0) {
        throw Object.assign(
          new Error('User is not a member of this committee'),
          { statusCode: 404 }
        );
      }

      const user = userRes.rows[0];

      // If removing the committee leader, demote their role
      const newRole = user.role === 'committee_leader' ? 'member' : user.role;

      const updateRes = await client.query(
        `UPDATE users
         SET committee_id = NULL, role = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, email, role, committee_id`,
        [newRole, userId]
      );

      // If they were the leader, unset committee's leader_id
      if (user.role === 'committee_leader') {
        await client.query(
          `UPDATE committees
           SET leader_id = NULL
           WHERE id = $1 AND leader_id = $2`,
          [committeeId, userId]
        );
      }

      await client.query('COMMIT');

      // Invalidate dashboard cache
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});

      return updateRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new CommitteesService();
