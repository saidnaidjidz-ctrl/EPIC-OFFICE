const { body, query, param } = require('express-validator');

/**
 * Utility helper to strip HTML tags using regular expressions.
 */
const stripHTML = (val) => {
  if (typeof val !== 'string') return val;
  return val.replace(/<\/?[^>]+(>|$)/g, '').trim();
};

/**
 * Validator schema for creating tasks.
 */
const createTaskValidation = [
  body('title')
    .exists({ checkFalsy: true })
    .withMessage('Task title is required')
    .isString()
    .withMessage('Title must be a string')
    .customSanitizer(stripHTML)
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters long'),

  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .customSanitizer(stripHTML)
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('committee_id')
    .exists({ checkFalsy: true })
    .withMessage('Committee ID is required')
    .isUUID()
    .withMessage('Committee ID must be a valid UUID'),

  body('assigned_to')
    .exists({ checkFalsy: true })
    .withMessage('Assigned To user ID is required')
    .isUUID()
    .withMessage('Assigned To must be a valid UUID'),

  body('priority')
    .exists({ checkFalsy: true })
    .withMessage('Priority is required')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),

  body('start_date')
    .exists({ checkFalsy: true })
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('due_date')
    .exists({ checkFalsy: true })
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (!req.body.start_date) return true;
      const start = new Date(req.body.start_date);
      const due = new Date(value);
      if (isNaN(start.getTime())) return true; // Let start_date validation catch parsing errors
      if (due < start) {
        throw new Error('Due date must be greater than or equal to start date');
      }
      return true;
    }),
];

/**
 * Validator schema for listing tasks.
 */
const listTasksValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed'])
    .withMessage('Status must be pending, in_progress, or completed'),

  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),

  query('committee_id')
    .optional()
    .isUUID()
    .withMessage('Committee ID must be a valid UUID'),

  query('assigned_to')
    .optional()
    .isUUID()
    .withMessage('Assigned to user ID must be a valid UUID'),

  query('due_date_from')
    .optional()
    .isISO8601()
    .withMessage('Due date from must be a valid ISO 8601 date'),

  query('due_date_to')
    .optional()
    .isISO8601()
    .withMessage('Due date to must be a valid ISO 8601 date'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer >= 1')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be an integer between 1 and 50')
    .toInt(),
];

/**
 * Validator schema checking UUID parameter format.
 */
const idValidation = [
  param('id')
    .isUUID()
    .withMessage('Task ID must be a valid UUID'),
];

/**
 * Validator schema for updating tasks.
 */
const updateTaskValidation = [
  param('id')
    .isUUID()
    .withMessage('Task ID must be a valid UUID'),

  body('title')
    .optional()
    .isString()
    .withMessage('Title must be a string')
    .customSanitizer(stripHTML)
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters long'),

  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string')
    .customSanitizer(stripHTML)
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('committee_id')
    .optional()
    .isUUID()
    .withMessage('Committee ID must be a valid UUID'),

  body('assigned_to')
    .optional()
    .isUUID()
    .withMessage('Assigned To must be a valid UUID'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),

  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed'])
    .withMessage('Status must be one of: pending, in_progress, completed'),

  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      // If start_date is also supplied, check chronological sorting
      if (req.body.start_date) {
        const start = new Date(req.body.start_date);
        const due = new Date(value);
        if (due < start) {
          throw new Error('Due date must be greater than or equal to start date');
        }
      }
      return true;
    }),
];

module.exports = {
  createTaskValidation,
  listTasksValidation,
  idValidation,
  updateTaskValidation,
};
