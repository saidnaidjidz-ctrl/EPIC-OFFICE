const express = require('express');
const { body, param } = require('express-validator');
const meetingsController = require('./meetings.controller');
const authenticateJWT = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const router = express.Router();

// Enforce authentication on all meeting operations
router.use(authenticateJWT);

/**
 * @route POST /api/meetings
 * @desc Schedule a new meeting
 * @access Private (President or Committee Leader)
 */
router.post(
  '/',
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Meeting title is required')
      .isLength({ min: 2, max: 255 })
      .withMessage('Meeting title must be between 2 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description cannot exceed 2000 characters'),
    body('scheduledAt')
      .isISO8601()
      .withMessage('Scheduled At must be a valid ISO 8601 date string'),
    body('location')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Location cannot exceed 255 characters'),
    body('meetingLink')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isURL()
      .withMessage('Meeting link must be a valid URL format'),
    body('attendeeIds')
      .optional()
      .isArray()
      .withMessage('Attendee IDs must be a list (array) of UUID strings'),
    body('attendeeIds.*')
      .optional()
      .isUUID()
      .withMessage('Each attendee ID must be a valid UUID format'),
    validate,
  ],
  meetingsController.create
);

/**
 * @route GET /api/meetings
 * @desc Retrieve list of all meetings
 * @access Private (All Approved Users)
 */
router.get('/', meetingsController.getAll);

/**
 * @route GET /api/meetings/:id
 * @desc Retrieve details and attendee list for a meeting
 * @access Private (All Approved Users)
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid meeting UUID format'),
    validate,
  ],
  meetingsController.getById
);

/**
 * @route DELETE /api/meetings/:id
 * @desc Cancel a meeting
 * @access Private (President or Meeting Creator)
 */
router.delete(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid meeting UUID format'),
    validate,
  ],
  meetingsController.delete
);

/**
 * @route POST /api/meetings/:id/attendees
 * @desc RSVP an attendee to a meeting
 * @access Private (President, Committee Leader, or Self RSVP)
 */
router.post(
  '/:id/attendees',
  [
    param('id').isUUID().withMessage('Invalid meeting UUID format'),
    body('userId').isUUID().withMessage('User ID must be a valid UUID format'),
    validate,
  ],
  meetingsController.addAttendee
);

/**
 * @route DELETE /api/meetings/:id/attendees
 * @desc Remove RSVP of an attendee
 * @access Private (President, Committee Leader, or Self removal)
 */
router.delete(
  '/:id/attendees',
  [
    param('id').isUUID().withMessage('Invalid meeting UUID format'),
    body('userId').isUUID().withMessage('User ID must be a valid UUID format'),
    validate,
  ],
  meetingsController.removeAttendee
);

module.exports = router;
