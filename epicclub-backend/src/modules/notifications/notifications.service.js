const db = require('../../config/db');

const ALLOWED_TYPES = [
  'task_assigned',
  'task_status_changed',
  'meeting_scheduled',
  'meeting_cancelled',
  'meeting_updated',
  'member_approved',
  'member_rejected',
  'committee_assigned',
  'admin_broadcast'
];

/**
 * Service to execute CRUD queries on notifications table.
 */
class NotificationsService {
  /**
   * Registers a notification for a user and pushes it to their active SSE stream if connected.
   */
  async createNotification(userId, type, title, body, metadata = null) {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new Error(`Invalid notification type: ${type}`);
    }

    const res = await db.query(
      `INSERT INTO notifications (user_id, type, title, body, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, body, metadata ? JSON.stringify(metadata) : null]
    );
    const notification = res.rows[0];

    // Send real-time event using the SSE Connection Manager
    const sseManager = require('./notifications.sse');
    sseManager.sendToUser(userId, notification);

    return notification;
  }

  /**
   * Fetches all notifications addressed to a user with pagination and filters.
   */
  async getNotifications(userId, { page = 1, limit = 10, unread_only = false } = {}) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const unreadOnlyBool = unread_only === true || unread_only === 'true';

    const offset = (parsedPage - 1) * parsedLimit;

    // Build query to fetch total count
    let countQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = $1';
    const countParams = [userId];
    if (unreadOnlyBool) {
      countQuery += ' AND is_read = false';
    }
    const countRes = await db.query(countQuery, countParams);
    const total = parseInt(countRes.rows[0].count, 10);

    // Build query to fetch paginated rows
    let selectQuery = 'SELECT * FROM notifications WHERE user_id = $1';
    const selectParams = [userId];
    if (unreadOnlyBool) {
      selectQuery += ' AND is_read = false';
    }
    selectQuery += ` ORDER BY created_at DESC LIMIT $${selectParams.length + 1} OFFSET $${selectParams.length + 2}`;
    selectParams.push(parsedLimit, offset);

    const res = await db.query(selectQuery, selectParams);

    return {
      notifications: res.rows,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  /**
   * Marks a single notification as read, validating ownership.
   */
  async markAsRead(notificationId, userId) {
    const res = await db.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    return res.rows[0] || null;
  }

  /**
   * Marks all notifications as read for a user.
   */
  async markAllAsRead(userId) {
    const res = await db.query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1 AND is_read = false
       RETURNING *`,
      [userId]
    );
    return res.rows;
  }

  /**
   * Deletes a notification, validating ownership.
   */
  async deleteNotification(notificationId, userId) {
    const res = await db.query(
      `DELETE FROM notifications
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );
    return res.rows[0] || null;
  }

  /**
   * Gets the unread notification count for a user.
   */
  async getUnreadCount(userId) {
    const res = await db.query(
      `SELECT COUNT(*) FROM notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = new NotificationsService();
