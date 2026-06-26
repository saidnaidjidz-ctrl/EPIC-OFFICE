const tasksService = require('./tasks.service');

/**
 * Controller coordinating all Task Management REST interactions.
 * Role-based field restrictions are enforced HERE before delegating to the service.
 */
class TasksController {
  /**
   * Creates a new task.
   * - President: can create for any committee
   * - Committee Leader: may only create tasks for their own committee
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async create(req, res, next) {
    try {
      const { role, committeeId } = req.user;
      const { committee_id } = req.body;

      // Committee leader boundary enforcement
      if (role === 'committee_leader' && committee_id !== committeeId) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: you can only create tasks for your own committee',
        });
      }

      const task = await tasksService.createTask(req.body, req.user.id);

      return res.status(201).json({
        success: true,
        message: 'Task created successfully',
        task,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists tasks with pagination and optional filters.
   * Visibility is automatically scoped by role inside the service.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getAll(req, res, next) {
    try {
      const result = await tasksService.getAllTasks(req.query, req.user);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves a single task by ID, enforcing role visibility.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const { role, committeeId, id: userId } = req.user;

      const task = await tasksService.getTaskById(id);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      // Apply same visibility rules as list endpoint
      if (role === 'committee_leader' && task.committee_id !== committeeId) {
        return res.status(403).json({ success: false, message: 'Access forbidden' });
      }
      if (role === 'member' && task.assigned_to !== userId) {
        return res.status(403).json({ success: false, message: 'Access forbidden' });
      }

      return res.status(200).json({ success: true, task });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates task fields with strict per-role field restrictions:
   *  - member: ONLY `status` (and only for tasks assigned to them)
   *  - committee_leader: all fields for tasks in their committee
   *  - president: all fields
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { role, committeeId, id: userId } = req.user;

      // Fetch existing task first to enforce access control
      const existing = await tasksService.getTaskById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      // ── Access checks ───────────────────────────────────────────────────────
      if (role === 'committee_leader' && existing.committee_id !== committeeId) {
        return res.status(403).json({ success: false, message: 'Access forbidden' });
      }
      if (role === 'member' && existing.assigned_to !== userId) {
        return res.status(403).json({ success: false, message: 'Access forbidden' });
      }

      // ── Field restriction enforcement ───────────────────────────────────────
      if (role === 'member') {
        // Members may ONLY update status
        const MEMBER_ALLOWED = new Set(['status']);
        const attemptedFields = Object.keys(req.body);
        const forbidden = attemptedFields.filter((f) => !MEMBER_ALLOWED.has(f));

        if (forbidden.length > 0) {
          return res.status(403).json({
            success: false,
            message: `Access forbidden: members can only update status. Disallowed fields: ${forbidden.join(', ')}`,
          });
        }

        // Enforce forward-only status progression
        const STATUS_ORDER = { pending: 0, in_progress: 1, completed: 2 };
        if (req.body.status !== undefined) {
          const currentIdx = STATUS_ORDER[existing.status] ?? -1;
          const newIdx     = STATUS_ORDER[req.body.status] ?? -1;
          if (newIdx < currentIdx) {
            return res.status(400).json({
              success: false,
              message: `Status cannot regress from '${existing.status}' to '${req.body.status}'`,
            });
          }
        }
      }

      const updatedTask = await tasksService.updateTask(id, req.body);
      if (!updatedTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        task: updatedTask,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Soft-deletes a task.
   * - President: any task
   * - Committee Leader: tasks in their own committee only
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const { role, committeeId } = req.user;

      const existing = await tasksService.getTaskById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      if (role === 'committee_leader' && existing.committee_id !== committeeId) {
        return res.status(403).json({ success: false, message: 'Access forbidden' });
      }

      const deleted = await tasksService.softDeleteTask(id);
      return res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
        task: deleted,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns aggregated task statistics scoped by role.
   * - President: system-wide stats
   * - Committee Leader: stats for their committee
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getStats(req, res, next) {
    try {
      const stats = await tasksService.getTaskStats(req.user);
      return res.status(200).json({ success: true, stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TasksController();
