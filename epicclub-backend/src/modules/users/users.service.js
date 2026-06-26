const db = require('../../config/db');

/**
 * Service class handling DB interactions for User accounts and Audit Logging.
 */
class UsersService {
  /**
   * Helper to insert a record into the audit_logs table.
   * 
   * @param {object} params
   * @param {string} params.action - Action identifier (e.g. 'USER_APPROVED')
   * @param {string} params.performedBy - User UUID executing the action
   * @param {string|null} params.targetUserId - Target user UUID
   * @param {object} params.details - Details payload (JSONB)
   * @param {string} params.ipAddress - Request IP address
   * @param {import('pg').PoolClient} [client] - Optional client for transaction context
   */
  async logAuditAction({ action, performedBy, targetUserId, details, ipAddress }, client = db) {
    await client.query(
      `INSERT INTO audit_logs (action, performed_by, target_user_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [action, performedBy, targetUserId || null, details ? JSON.stringify(details) : null, ipAddress]
    );
  }

  /**
   * Retrieves user profile details by ID, ignoring soft-deleted users.
   * 
   * @param {string} id - User UUID
   * @returns {Promise<object|null>} The user profile or null
   */
  async getUserById(id) {
    const res = await db.query(
      `SELECT id, email, name, avatar_url, role, status, committee_id, created_at, updated_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * Retrieves a paginated and filtered list of active users.
   * 
   * @param {object} filter
   * @param {string} [filter.status] - Filter by status
   * @param {string} [filter.committee_id] - Filter by committee
   * @param {string} [filter.role] - Filter by role
   * @param {number} [filter.page] - Page number (defaults to 1)
   * @param {number} [filter.limit] - Page limit (defaults to 20, max 50)
   * @returns {Promise<{users: Array, pagination: {total: number, page: number, limit: number, totalPages: number}}>}
   */
  async getAllUsers({ status, committee_id, role, page = 1, limit = 20 }) {
    const activeLimit = Math.min(limit, 50);
    const offset = (page - 1) * activeLimit;
    const params = [];

    let baseFilter = 'WHERE deleted_at IS NULL';

    if (status) {
      params.push(status);
      baseFilter += ` AND status = $${params.length}`;
    }
    if (role) {
      params.push(role);
      baseFilter += ` AND role = $${params.length}`;
    }
    if (committee_id) {
      params.push(committee_id);
      baseFilter += ` AND committee_id = $${params.length}`;
    }

    // 1. Query the total count matching filters
    const countRes = await db.query(
      `SELECT COUNT(*) FROM users ${baseFilter}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // 2. Query paginated details
    const selectParams = [...params];
    selectParams.push(activeLimit);
    const limitPlaceholder = `$${selectParams.length}`;
    selectParams.push(offset);
    const offsetPlaceholder = `$${selectParams.length}`;

    const usersRes = await db.query(
      `SELECT id, email, name, avatar_url, role, status, committee_id, created_at
       FROM users
       ${baseFilter}
       ORDER BY created_at DESC
       LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      selectParams
    );

    const totalPages = Math.ceil(total / activeLimit) || 1;

    return {
      users: usersRes.rows,
      pagination: {
        total,
        page,
        limit: activeLimit,
        totalPages,
      },
    };
  }

  /**
   * Approves a pending user request, assigning them a committee and role.
   * Runs inside a SQL transaction.
   * 
   * @param {string} id - Target user UUID
   * @param {object} details
   * @param {string} [details.committee_id] - Committee UUID
   * @param {string} details.role - Member or Committee Leader role
   * @param {string} performedBy - Actor UUID
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<object>} The updated user profile
   */
  async approveUser(id, { committee_id, role }, performedBy, ipAddress) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify user exists and is pending
      const checkRes = await client.query(
        'SELECT status FROM users WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (checkRes.rowCount === 0) {
        throw new Error('User not found');
      }
      if (checkRes.rows[0].status !== 'pending') {
        throw new Error('User is not in pending status');
      }

      // 2. Update status and assignment details
      const updateRes = await client.query(
        `UPDATE users
         SET status = 'approved',
             role = $1,
             committee_id = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, email, name, role, status, committee_id`,
        [role, committee_id || null, id]
      );
      const updatedUser = updateRes.rows[0];

      // 3. Dispatch system notification to approved user
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, metadata)
         VALUES ($1, 'member_approved', 'Account Approved', 'Welcome! Your Epic Club account request has been approved by the administrator.', $2)`,
        [id, JSON.stringify({ role, committee_id: committee_id || null })]
      );

      // 4. Log the action to audit_logs
      await this.logAuditAction(
        {
          action: 'USER_APPROVED',
          performedBy,
          targetUserId: id,
          details: { role, committee_id: committee_id || null },
          ipAddress,
        },
        client
      );

      await client.query('COMMIT');

      // Invalidate dashboard cache
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});

      // Push SSE update
      try {
        const sseManager = require('../notifications/notifications.sse');
        sseManager.sendToUser(id, {
          user_id: id,
          type: 'member_approved',
          title: 'Account Approved',
          body: 'Welcome! Your Epic Club account request has been approved by the administrator.',
          metadata: { role, committee_id: committee_id || null }
        });
      } catch (err) {
        // Ignore
      }

      // Send approval email notification (non-blocking)
      try {
        const { sendApprovalEmail } = require('../../services/verificationService');
        sendApprovalEmail(updatedUser, role).catch(() => {});
      } catch (err) {
        // Ignore email failures
      }

      return updatedUser;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rejects a pending user membership request.
   * 
   * @param {string} id - Target user UUID
   * @param {object} details
   * @param {string} [details.reason] - Rejection rationale
   * @param {string} performedBy - Actor UUID
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<object>} The updated user status
   */
  async rejectUser(id, { reason }, performedBy, ipAddress) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const checkRes = await client.query(
        'SELECT status FROM users WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (checkRes.rowCount === 0) {
        throw new Error('User not found');
      }
      if (checkRes.rows[0].status !== 'pending') {
        throw new Error('User is not in pending status');
      }

      const updateRes = await client.query(
        `UPDATE users
         SET status = 'rejected', updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, name, status`,
        [id]
      );
      const updatedUser = updateRes.rows[0];

      // Dispatch notification
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, metadata)
         VALUES ($1, 'member_rejected', 'Account Request Rejected', 'Your Epic Club account registration has been rejected by the administrator.', $2)`,
        [id, JSON.stringify({ reason: reason || null })]
      );

      // Audit log
      await this.logAuditAction(
        {
          action: 'USER_REJECTED',
          performedBy,
          targetUserId: id,
          details: { reason: reason || null },
          ipAddress,
        },
        client
      );

      await client.query('COMMIT');

      // Invalidate dashboard cache
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});

      // Push SSE update
      try {
        const sseManager = require('../notifications/notifications.sse');
        sseManager.sendToUser(id, {
          user_id: id,
          type: 'member_rejected',
          title: 'Account Request Rejected',
          body: 'Your Epic Club account registration has been rejected by the administrator.',
          metadata: { reason: reason || null }
        });
      } catch (err) {
        // Ignore
      }

      // Send rejection email notification (non-blocking)
      try {
        const { sendRejectionEmail } = require('../../services/verificationService');
        sendRejectionEmail(updatedUser, reason).catch(() => {});
      } catch (err) {
        // Ignore email failures
      }

      return updatedUser;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Updates an approved user's role designation.
   * Enforces role boundary checks (preventing demoting or promoting other presidents).
   * 
   * @param {string} id - Target user UUID
   * @param {object} details
   * @param {string} details.role - Target role ('committee_leader'|'member')
   * @param {string} details.committee_id - Associated committee ID
   * @param {string} performedBy - Actor UUID
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<object>} Updated user details
   */
  async updateUserRole(id, { role, committee_id }, performedBy, ipAddress) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const checkRes = await client.query(
        'SELECT role, status, committee_id FROM users WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (checkRes.rowCount === 0) {
        throw new Error('User not found');
      }

      const targetUser = checkRes.rows[0];

      // Security Check: Cannot modify the role of another president
      if (targetUser.role === 'president') {
        throw new Error('Cannot demote or modify the role of a president');
      }

      const updateRes = await client.query(
        `UPDATE users
         SET role = $1, committee_id = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, email, name, role, status, committee_id`,
        [role, committee_id, id]
      );
      const updatedUser = updateRes.rows[0];

      // Dispatch alert
      await client.query(
        `INSERT INTO notifications (user_id, type, title, body, metadata)
         VALUES ($1, 'committee_assigned', 'Role / Committee Updated', 'Your organizational role has been updated to: ' || $2 || '.', $3)`,
        [id, role, JSON.stringify({ role, committee_id })]
      );

      // Audit log
      await this.logAuditAction(
        {
          action: 'USER_ROLE_UPDATED',
          performedBy,
          targetUserId: id,
          details: {
            old_role: targetUser.role,
            old_committee_id: targetUser.committee_id,
            new_role: role,
            new_committee_id: committee_id,
          },
          ipAddress,
        },
        client
      );

      await client.query('COMMIT');

      // Invalidate dashboard cache
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});

      // Push SSE update
      try {
        const sseManager = require('../notifications/notifications.sse');
        sseManager.sendToUser(id, {
          user_id: id,
          type: 'committee_assigned',
          title: 'Role / Committee Updated',
          body: `Your organizational role has been updated to: ${role}.`,
          metadata: { role, committee_id }
        });
      } catch (err) {
        // Ignore
      }

      return updatedUser;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft deletes a user account, revokes active refresh tokens, and logs the action.
   * 
   * @param {string} id - Target user UUID to delete
   * @param {string} performedBy - Actor UUID executing the delete
   * @param {string} ipAddress - Client IP address
   * @returns {Promise<object>} The deleted user record stub
   */
  async softDeleteUser(id, performedBy, ipAddress) {
    // Check self-deletion bound early
    if (id === performedBy) {
      throw new Error('Self deletion is forbidden');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const checkRes = await client.query(
        'SELECT role FROM users WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (checkRes.rowCount === 0) {
        throw new Error('User not found');
      }

      if (checkRes.rows[0].role === 'president') {
        throw new Error('Cannot soft-delete a president');
      }

      // 1. Soft-delete target user
      const deleteRes = await client.query(
        `UPDATE users
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, name, role`,
        [id]
      );
      const deletedUser = deleteRes.rows[0];

      // 2. Revoke all refresh tokens for that user
      await client.query(
        'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
        [id]
      );

      // 3. Log audit event
      await this.logAuditAction(
        {
          action: 'USER_DELETED',
          performedBy,
          targetUserId: id,
          details: { soft_delete: true },
          ipAddress,
        },
        client
      );

      await client.query('COMMIT');

      // Invalidate dashboard cache
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});

      return deletedUser;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all pending approval registrations.
   * 
   * @returns {Promise<Array<{id: string, name: string, email: string, avatar: string, registered_at: string}>>}
   */
  async getPendingUsers() {
    const res = await db.query(
      `SELECT id, name, email, avatar_url as avatar, created_at as registered_at
       FROM users
       WHERE status = 'pending' AND deleted_at IS NULL
       ORDER BY created_at ASC`
    );
    return res.rows;
  }
}

module.exports = new UsersService();
