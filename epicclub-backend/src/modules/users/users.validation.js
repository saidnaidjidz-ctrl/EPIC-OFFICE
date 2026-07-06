const { query, param, body } = require('express-validator');

/**
 * Validation schema for listing users with pagination and filters.
 */
const listUsersValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Status must be pending, approved, or rejected'),
  query('role')
    .optional()
    .isIn(['president', 'committee_leader', 'member'])
    .withMessage('Role must be president, committee_leader, or member'),
  query('committee_id')
    .optional()
    .isUUID()
    .withMessage('Committee ID must be a valid UUID'),
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
 * Validation schema checking path ID formats (valid UUID).
 */
const idValidation = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
];

/**
 * Validation schema for user approval.
 */
const approveValidation = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('role')
    .isIn(['committee_leader', 'member'])
    .withMessage('Role must be either committee_leader or member'),
  body('committee_id')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage('Committee ID must be a valid UUID'),
];

/**
 * Validation schema for user rejection, including custom HTML stripping sanitization.
 */
const rejectValidation = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
    .customSanitizer((val) => {
      if (typeof val !== 'string') return val;
      // Strip HTML tags using regex
      return val.replace(/<\/?[^>]+(>|$)/g, '');
    })
    .trim(),
];

/**
 * Validation schema for changing roles.
 */
const updateRoleValidation = [
  param('id')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('role')
    .isIn(['committee_leader', 'member'])
    .withMessage('Role must be either committee_leader or member'),
  body('committee_id')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage('Committee ID must be a valid UUID'),
];

module.exports = {
  listUsersValidation,
  idValidation,
  approveValidation,
  rejectValidation,
  updateRoleValidation,
};
