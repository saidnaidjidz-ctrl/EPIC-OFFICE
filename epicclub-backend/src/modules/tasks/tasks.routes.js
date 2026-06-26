const express = require('express');
const tasksController    = require('./tasks.controller');
const authenticateJWT    = require('../../middleware/auth');
const { requireRole }    = require('../../middleware/rbac');
const validate           = require('../../middleware/validate');
const {
  createTaskValidation,
  listTasksValidation,
  idValidation,
  updateTaskValidation,
} = require('./tasks.validation');

const router = express.Router();

// Every tasks route requires a valid, approved session
router.use(authenticateJWT);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tasks/stats  — must be BEFORE /:id to avoid "stats" being parsed as UUID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/tasks/stats
 * @desc   Aggregate task statistics (totals, by-status, by-priority, overdue)
 * @access President | Committee Leader
 */
router.get(
  '/stats',
  requireRole('president', 'committee_leader'),
  tasksController.getStats
);

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/tasks
 * @desc   Create a new task
 * @access President | Committee Leader
 */
router.post(
  '/',
  requireRole('president', 'committee_leader'),
  ...createTaskValidation,
  validate,
  tasksController.create
);

/**
 * @route  GET /api/tasks
 * @desc   List tasks (role-scoped) with pagination + optional filters
 * @access All approved users
 */
router.get(
  '/',
  ...listTasksValidation,
  validate,
  tasksController.getAll
);

/**
 * @route  GET /api/tasks/:id
 * @desc   Get a single task (role-scoped visibility)
 * @access All approved users
 */
router.get(
  '/:id',
  ...idValidation,
  validate,
  tasksController.getById
);

/**
 * @route  PATCH /api/tasks/:id
 * @desc   Update task fields (field restrictions enforced by controller)
 * @access All approved users (field access differs per role)
 */
router.patch(
  '/:id',
  ...updateTaskValidation,
  validate,
  tasksController.update
);

/**
 * @route  DELETE /api/tasks/:id
 * @desc   Soft-delete a task
 * @access President | Committee Leader (own committee only for leaders)
 */
router.delete(
  '/:id',
  requireRole('president', 'committee_leader'),
  ...idValidation,
  validate,
  tasksController.remove
);

module.exports = router;
