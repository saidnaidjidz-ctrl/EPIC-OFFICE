const notificationsService = require('./notifications.service');
const notificationsSse = require('./notifications.sse');

/**
 * Controller to handle Server-Sent Events and REST notification requests.
 */
class NotificationsController {
  /**
   * Establishes real-time SSE stream connection for the authenticated user.
   */
  async stream(req, res, next) {
    try {
      // Establish the SSE stream connection
      notificationsSse.handleConnect(req.user.id, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves notification feed for the current user (paginated & optional filter).
   */
  async getNotifications(req, res, next) {
    try {
      const { page, limit, unread_only } = req.query;
      const result = await notificationsService.getNotifications(req.user.id, {
        page,
        limit,
        unread_only,
      });

      return res.status(200).json({
        success: true,
        notifications: result.notifications,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns current count of unread notifications for the authenticated user.
   */
  async getUnreadCount(req, res, next) {
    try {
      const count = await notificationsService.getUnreadCount(req.user.id);
      return res.status(200).json({
        success: true,
        unread_count: count,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Marks a user's notification as read.
   */
  async markRead(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await notificationsService.markAsRead(id, req.user.id);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read.',
        notification: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Marks all notifications of the user as read.
   */
  async markAllRead(req, res, next) {
    try {
      const updated = await notificationsService.markAllAsRead(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read.',
        count: updated.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a notification, ensuring ownership.
   */
  async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await notificationsService.deleteNotification(id, req.user.id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notification deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sends manual administrative alert (President or Committee Leader only).
   */
  async createNotification(req, res, next) {
    try {
      const { userId, type, title, body, metadata } = req.body;

      if (req.user.role !== 'president' && req.user.role !== 'committee_leader') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only administrators can send manual notifications.',
        });
      }

      const notification = await notificationsService.createNotification(
        userId,
        type || 'admin_broadcast',
        title,
        body,
        metadata
      );

      return res.status(201).json({
        success: true,
        message: 'Notification sent successfully.',
        notification,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationsController();
