const db = require('../../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// SAFE DYNAMIC QUERY BUILDER
// Builds parameterized WHERE clauses — NEVER concatenates user values into SQL.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a safe, parameterized WHERE clause from a conditions array.
 *
 * @param {Array<{clause: string, value: any}>} conditions
 *   Each entry has a `clause` (e.g. 't.status = $?') and a `value`.
 *   The `$?` placeholder is replaced with the correct positional index.
 * @param {number} [startIndex=1] - Starting $N index for placeholders
 * @returns {{ whereSQL: string, params: Array<any> }}
 */
const buildWhereClause = (conditions, startIndex = 1) => {
  const params = [];
  const clauses = [];
  let idx = startIndex;

  for (const { clause, value } of conditions) {
    // Replace literal `$?` token with the actual positional placeholder
    clauses.push(clause.replace('$?', `$${idx}`));
    params.push(value);
    idx++;
  }

  const whereSQL = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '';
  return { whereSQL, params };
};

// ─────────────────────────────────────────────────────────────────────────────
// TASK SERVICE
// ─────────────────────────────────────────────────────────────────────────────

class TasksService {
  /**
   * Creates a new task after verifying the assignee belongs to the same committee.
   *
   * @param {object} data - Task payload
   * @param {string} createdBy - Actor UUID
   * @returns {Promise<object>} Created task with assignee and committee info
   */
  async createTask(
    { title, description, committee_id, assigned_to, priority, status, start_date, due_date },
    createdBy
  ) {
    // Verify committee exists
    const committeeRes = await db.query(
      'SELECT id FROM committees WHERE id = $1',
      [committee_id]
    );
    if (committeeRes.rowCount === 0) {
      throw new Error('Committee not found');
    }

    // Verify assignee is an approved member of that committee
    const assigneeRes = await db.query(
      `SELECT id FROM users
       WHERE id = $1
         AND committee_id = $2
         AND status = 'approved'
         AND deleted_at IS NULL`,
      [assigned_to, committee_id]
    );
    if (assigneeRes.rowCount === 0) {
      throw new Error('Assigned user is not an approved member of this committee');
    }

    const res = await db.query(
      `INSERT INTO tasks
         (title, description, committee_id, assigned_to, created_by,
          priority, status, start_date, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title,
        description ?? null,
        committee_id,
        assigned_to,
        createdBy,
        priority,
        status ?? 'pending',
        start_date,
        due_date,
      ]
    );
    const task = res.rows[0];

    if (task.assigned_to) {
      try {
        const notificationsService = require('../notifications/notifications.service');
        await notificationsService.createNotification(
          task.assigned_to,
          'task_assigned',
          'New Task Assigned',
          `You have been assigned a new task: "${task.title}".`,
          { taskId: task.id, committeeId: task.committee_id }
        );
      } catch (err) {
        console.error('Failed to trigger task_assigned notification:', err.message);
      }
    }

    // Invalidate dashboard cache
    const dashboardService = require('../dashboard/dashboard.service');
    dashboardService.invalidateDashboardCache().catch(() => {});

    // Enrich with relational data
    return this._enrichTask(task);
  }

  /**
   * Retrieves paginated tasks. Visibility is role-scoped:
   *  - president     → all tasks
   *  - leader        → tasks in their committee
   *  - member        → tasks assigned to them
   *
   * @param {object} filters - Optional query filters
   * @param {object} user    - req.user with id, role, committeeId
   * @returns {Promise<{tasks: Array, pagination: object}>}
   */
  async getAllTasks(filters, user) {
    const {
      status,
      priority,
      committee_id,
      assigned_to,
      due_date_from,
      due_date_to,
      page = 1,
      limit = 20,
    } = filters;

    const activeLimit = Math.min(Number(limit), 50);
    const offset = (Number(page) - 1) * activeLimit;

    // ── Base mandatory conditions (soft-delete filter) ──────────────────────
    const baseParams = [];
    let baseWhere = 'WHERE t.deleted_at IS NULL';

    // ── Role-scope conditions (hard constraints, not overridable) ───────────
    if (user.role === 'committee_leader') {
      baseParams.push(user.committeeId);
      baseWhere += ` AND t.committee_id = $${baseParams.length}`;
    } else if (user.role === 'member') {
      baseParams.push(user.id);
      baseWhere += ` AND t.assigned_to = $${baseParams.length}`;
    }
    // president has no extra hard constraint

    // ── Optional filter conditions (user-supplied) ──────────────────────────
    const optionalConditions = [];
    if (status)        optionalConditions.push({ clause: 't.status = $?',        value: status });
    if (priority)      optionalConditions.push({ clause: 't.priority = $?',      value: priority });
    if (due_date_from) optionalConditions.push({ clause: 't.due_date >= $?',     value: due_date_from });
    if (due_date_to)   optionalConditions.push({ clause: 't.due_date <= $?',     value: due_date_to });

    // President/leader can also filter by committee_id / assigned_to
    if (user.role === 'president') {
      if (committee_id) optionalConditions.push({ clause: 't.committee_id = $?', value: committee_id });
      if (assigned_to)  optionalConditions.push({ clause: 't.assigned_to = $?',  value: assigned_to });
    }

    const { whereSQL, params: optParams } = buildWhereClause(
      optionalConditions,
      baseParams.length + 1
    );

    const allFilterParams = [...baseParams, ...optParams];

    // ── Count query ──────────────────────────────────────────────────────────
    const countRes = await db.query(
      `SELECT COUNT(*) FROM tasks t ${baseWhere} ${whereSQL}`,
      allFilterParams
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // ── Data query ───────────────────────────────────────────────────────────
    const dataParams = [...allFilterParams, activeLimit, offset];
    const limitIdx  = dataParams.length - 1;
    const offsetIdx = dataParams.length;

    const tasksRes = await db.query(
      `SELECT
         t.id, t.title, t.description, t.priority, t.status,
         t.start_date, t.due_date, t.committee_id, t.assigned_to,
         t.created_by, t.created_at, t.updated_at,
         u.name  AS assignee_name,  u.email AS assignee_email,
         c.name  AS committee_name,
         cr.name AS creator_name
       FROM tasks t
       LEFT JOIN users      u  ON t.assigned_to  = u.id
       LEFT JOIN committees c  ON t.committee_id = c.id
       LEFT JOIN users      cr ON t.created_by   = cr.id
       ${baseWhere} ${whereSQL}
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      dataParams
    );

    return {
      tasks: tasksRes.rows,
      pagination: {
        total,
        page: Number(page),
        limit: activeLimit,
        totalPages: Math.ceil(total / activeLimit) || 1,
      },
    };
  }

  /**
   * Retrieves a single task by ID (soft-delete aware).
   *
   * @param {string} id - Task UUID
   * @returns {Promise<object|null>}
   */
  async getTaskById(id) {
    const res = await db.query(
      `SELECT
         t.id, t.title, t.description, t.priority, t.status,
         t.start_date, t.due_date, t.committee_id, t.assigned_to,
         t.created_by, t.created_at, t.updated_at,
         u.name  AS assignee_name,  u.email AS assignee_email,
         c.name  AS committee_name,
         cr.name AS creator_name
       FROM tasks t
       LEFT JOIN users      u  ON t.assigned_to  = u.id
       LEFT JOIN committees c  ON t.committee_id = c.id
       LEFT JOIN users      cr ON t.created_by   = cr.id
       WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [id]
    );
    return res.rows[0] ?? null;
  }

  /**
   * Updates task fields with role-aware field restrictions.
   * Members may ONLY update `status`; others may update any provided field.
   *
   * @param {string}   id       - Task UUID
   * @param {object}   fields   - Fields to update (already role-validated by controller)
   * @returns {Promise<object>} Updated enriched task
   */
  async updateTask(id, fields) {
    const oldTask = await this.getTaskById(id);
    if (!oldTask) {
      return null;
    }

    const ALLOWED_COLS = {
      title:        'title',
      description:  'description',
      committee_id: 'committee_id',
      assigned_to:  'assigned_to',
      priority:     'priority',
      status:       'status',
      start_date:   'start_date',
      due_date:     'due_date',
    };

    const setClauses = [];
    const params     = [];

    for (const [key, col] of Object.entries(ALLOWED_COLS)) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        setClauses.push(`${col} = $${params.length}`);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields provided for update');
    }

    params.push(id);
    const res = await db.query(
      `UPDATE tasks
       SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length} AND deleted_at IS NULL
       RETURNING *`,
      params
    );

    if (res.rowCount === 0) {
      return null;
    }

    const updatedTask = await this._enrichTask(res.rows[0]);

    // Check status change
    if (oldTask.status !== updatedTask.status) {
      try {
        const notificationsService = require('../notifications/notifications.service');
        const statusMsg = `Task "${updatedTask.title}" status changed from ${oldTask.status} to ${updatedTask.status}.`;
        
        // Notify task creator
        if (updatedTask.created_by) {
          await notificationsService.createNotification(
            updatedTask.created_by,
            'task_status_changed',
            'Task Status Updated',
            statusMsg,
            { taskId: updatedTask.id, oldStatus: oldTask.status, newStatus: updatedTask.status }
          );
        }
        
        // Notify assignee (if different from creator)
        if (updatedTask.assigned_to && updatedTask.assigned_to !== updatedTask.created_by) {
          await notificationsService.createNotification(
            updatedTask.assigned_to,
            'task_status_changed',
            'Task Status Updated',
            statusMsg,
            { taskId: updatedTask.id, oldStatus: oldTask.status, newStatus: updatedTask.status }
          );
        }
      } catch (err) {
        console.error('Failed to trigger task_status_changed notification:', err.message);
      }
    }

    // Check assignee change
    if (fields.assigned_to && oldTask.assigned_to !== updatedTask.assigned_to) {
      try {
        const notificationsService = require('../notifications/notifications.service');
        await notificationsService.createNotification(
          updatedTask.assigned_to,
          'task_assigned',
          'New Task Assigned',
          `You have been assigned a new task: "${updatedTask.title}".`,
          { taskId: updatedTask.id, committeeId: updatedTask.committee_id }
        );
      } catch (err) {
        console.error('Failed to trigger task_assigned notification in update:', err.message);
      }
    }

    // Invalidate dashboard cache
    const dashboardService = require('../dashboard/dashboard.service');
    dashboardService.invalidateDashboardCache().catch(() => {});

    return updatedTask;
  }

  /**
   * Soft-deletes a task by setting deleted_at timestamp.
   *
   * @param {string} id - Task UUID
   * @returns {Promise<object|null>} The deleted record stub or null
   */
  async softDeleteTask(id) {
    const res = await db.query(
      `UPDATE tasks
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, title, committee_id`,
      [id]
    );
    if (res.rowCount > 0) {
      const dashboardService = require('../dashboard/dashboard.service');
      dashboardService.invalidateDashboardCache().catch(() => {});
    }
    return res.rows[0] ?? null;
  }

  /**
   * Returns aggregated statistics for tasks.
   * Committee leaders receive stats scoped to their committee.
   *
   * @param {object} user - req.user
   * @returns {Promise<object>} Stats payload
   */
  async getTaskStats(user) {
    const params = [];
    let scopeFilter = 'WHERE deleted_at IS NULL';

    if (user.role === 'committee_leader') {
      params.push(user.committeeId);
      scopeFilter += ` AND committee_id = $${params.length}`;
    }

    const statsRes = await db.query(
      `SELECT
         COUNT(*)                                                    AS total,
         COUNT(*) FILTER (WHERE status = 'pending')                 AS pending,
         COUNT(*) FILTER (WHERE status = 'in_progress')             AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')               AS completed,
         COUNT(*) FILTER (WHERE priority = 'low')                   AS priority_low,
         COUNT(*) FILTER (WHERE priority = 'medium')                AS priority_medium,
         COUNT(*) FILTER (WHERE priority = 'high')                  AS priority_high,
         COUNT(*) FILTER (WHERE priority = 'urgent')                AS priority_urgent,
         COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed') AS overdue
       FROM tasks
       ${scopeFilter}`,
      params
    );

    const row = statsRes.rows[0];
    return {
      total:       parseInt(row.total, 10),
      byStatus: {
        pending:    parseInt(row.pending, 10),
        in_progress: parseInt(row.in_progress, 10),
        completed:  parseInt(row.completed, 10),
      },
      byPriority: {
        low:    parseInt(row.priority_low, 10),
        medium: parseInt(row.priority_medium, 10),
        high:   parseInt(row.priority_high, 10),
        urgent: parseInt(row.priority_urgent, 10),
      },
      overdue: parseInt(row.overdue, 10),
    };
  }

  // ── Private helper ──────────────────────────────────────────────────────────

  /**
   * Enriches a raw task row with relational names via a single JOIN query.
   * @param {object} task - Raw DB row
   * @returns {Promise<object>} Enriched task
   */
  async _enrichTask(task) {
    const res = await db.query(
      `SELECT
         t.id, t.title, t.description, t.priority, t.status,
         t.start_date, t.due_date, t.committee_id, t.assigned_to,
         t.created_by, t.created_at, t.updated_at,
         u.name  AS assignee_name,  u.email AS assignee_email,
         c.name  AS committee_name,
         cr.name AS creator_name
       FROM tasks t
       LEFT JOIN users      u  ON t.assigned_to  = u.id
       LEFT JOIN committees c  ON t.committee_id = c.id
       LEFT JOIN users      cr ON t.created_by   = cr.id
       WHERE t.id = $1`,
      [task.id]
    );
    return res.rows[0] ?? task;
  }
}

module.exports = new TasksService();
