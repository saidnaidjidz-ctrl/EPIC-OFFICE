const express = require('express');
const { body, query, param } = require('express-validator');
const notificationsController = require('./notifications.controller');
const authenticateJWT = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const validate = require('../../middleware/validate');

const router = express.Router();

// Enforce authentication on all notifications routes
router.use(authenticateJWT);

/**
 * @route GET /api/notifications/stream
 * @desc Establish Server-Sent Events stream connection
 * @access Private (All Approved Users)
 */
router.get('/stream', notificationsController.stream);

/**
 * @route GET /api/notifications/unread-count
 * @desc Get count of unread notifications for logged-in user
 * @access Private (All Approved Users)
 */
router.get('/unread-count', notificationsController.getUnreadCount);

/**
 * @route PATCH /api/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private (All Approved Users)
 */
router.patch('/read-all', notificationsController.markAllRead);

/**
 * @route GET /api/notifications
 * @desc Fetch notifications feed with pagination and read-filters
 * @access Private (All Approved Users)
 */
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer >= 1')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be an integer between 1 and 100')
      .toInt(),
    query('unread_only')
      .optional()
      .isBoolean()
      .withMessage('unread_only must be a boolean value')
      .customSanitizer((val) => val === 'true' || val === true),
    validate,
  ],
  notificationsController.getNotifications
);

/**
 * @route PATCH /api/notifications/:id/read
 * @desc Mark a specific notification as read
 * @access Private (Owner of the notification)
 */
router.patch(
  '/:id/read',
  [
    param('id').isUUID().withMessage('Invalid notification ID format'),
    validate,
  ],
  notificationsController.markRead
);

/**
 * @route DELETE /api/notifications/:id
 * @desc Delete a specific notification
 * @access Private (Owner of the notification)
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid notification ID format'),
    validate,
  ],
  notificationsController.deleteNotification
);

/**
 * @route POST /api/notifications
 * @desc Send custom administrative notification to a user
 * @access Private (President or Committee Leader Only)
 */
router.post(
  '/',
  [
    requireRole(['president', 'committee_leader']),
    body('userId')
      .isUUID()
      .withMessage('Recipient user ID must be a valid UUID format'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Notification title is required')
      .isLength({ min: 2, max: 255 })
      .withMessage('Title must be between 2 and 255 characters'),
    body('body')
      .trim()
      .notEmpty()
      .withMessage('Notification body is required')
      .isLength({ min: 2, max: 2000 })
      .withMessage('Body must be between 2 and 2000 characters'),
    body('type')
      .optional()
      .trim()
      .isIn([
        'task_assigned',
        'task_status_changed',
        'meeting_scheduled',
        'meeting_cancelled',
        'meeting_updated',
        'member_approved',
        'member_rejected',
        'committee_assigned',
        'admin_broadcast'
      ])
      .withMessage('Invalid notification type designation'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be a JSON object structure'),
    validate,
  ],
  notificationsController.createNotification
);

module.exports = router;
