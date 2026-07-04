const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

const adminRoles = new Set(['admin', 'maitre_ouvrage', "maitre d'ouvrage", 'maître d’ouvrage']);
const supervisorRoles = new Set(['superviseur', 'supervisor', 'chef chantier', 'chef_chantier']);

const roleGuard = (allowedRoles) => async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    const role = String(rows[0]?.role || '').toLowerCase();
    if (!allowedRoles.has(role)) {
      return res.status(403).json({ success: false, error: 'Accès non autorisé.' });
    }
    next();
  } catch (error) {
    next(error);
  }
};

const canManageTasks = roleGuard(new Set([...adminRoles, ...supervisorRoles]));
const canDeleteTasks = roleGuard(adminRoles);

const taskSelect = `
  SELECT
    t.id, t.project_id, t.parent_task_id, t.wbs_code, COALESCE(t.name, t.title) AS name,
    t.planned_start, t.planned_end, t.actual_start, t.actual_end,
    t.duration_days, t.progress_percent, t.planned_cost, t.actual_cost,
    t.responsible_user_id, u.name AS responsible_name, t.status, t.notes,
    t.dependencies, t.color,
    (
      (t.actual_end IS NOT NULL AND t.planned_end IS NOT NULL AND t.actual_end > t.planned_end)
      OR (t.status <> 'done' AND t.planned_end IS NOT NULL AND t.planned_end < CURRENT_DATE)
    ) AS is_delayed
  FROM tasks t
  LEFT JOIN users u ON u.id = t.responsible_user_id
`;

const computeDuration = (start, end, duration) => {
  if (duration !== undefined && duration !== null && duration !== '') return Number(duration);
  if (!start || !end) return 0;
  const diff = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
  return Number.isFinite(diff) ? Math.max(diff, 0) : 0;
};

const updateProjectActualCost = async (client, projectId) => {
  await client.query(
    `UPDATE projects
     SET actual_cost = COALESCE(costs.total, 0),
         budget_spent = COALESCE(costs.total, 0)
     FROM (
       SELECT COALESCE(SUM(actual_cost), 0) AS total
       FROM tasks
       WHERE project_id = $1
     ) costs
     WHERE projects.id = $1`,
    [projectId]
  );
};

router.get('/projects/:project_id/tasks', authenticateToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `${taskSelect}
       WHERE t.project_id = $1
       ORDER BY COALESCE(t.wbs_code, t.id::text) ASC, t.planned_start ASC NULLS LAST`,
      [req.params.project_id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/projects/:project_id/summary', authenticateToken, async (req, res, next) => {
  try {
    const project = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.project_id]);
    if (!project.rows.length) return res.status(404).json({ error: 'Projet non trouvé' });

    const { rows } = await pool.query(
      `WITH task_data AS (
        SELECT *,
          (
            (actual_end IS NOT NULL AND planned_end IS NOT NULL AND actual_end > planned_end)
            OR (status <> 'done' AND planned_end IS NOT NULL AND planned_end < CURRENT_DATE)
          ) AS is_delayed
        FROM tasks
        WHERE project_id = $1
      )
      SELECT
        COALESCE(
          SUM(COALESCE(progress_percent, 0) * GREATEST(COALESCE(duration_days, 1), 1))
          / NULLIF(SUM(GREATEST(COALESCE(duration_days, 1), 1)), 0),
          0
        ) AS overall_progress,
        COALESCE(SUM(planned_cost), 0) AS total_planned_cost,
        COALESCE(SUM(actual_cost), 0) AS total_actual_cost,
        COUNT(*)::int AS tasks_total,
        COUNT(*) FILTER (WHERE status = 'done')::int AS tasks_done,
        COUNT(*) FILTER (WHERE is_delayed)::int AS tasks_delayed,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int AS tasks_in_progress
      FROM task_data`,
      [req.params.project_id]
    );

    const p = project.rows[0];
    const summary = rows[0];
    const plannedBudget = Number(p.planned_budget || p.budget_total || summary.total_planned_cost || 0);
    const actualCost = Number(summary.total_actual_cost || p.actual_cost || p.budget_spent || 0);
    const start = p.start_date ? new Date(p.start_date) : null;
    const end = p.end_date ? new Date(p.end_date) : null;
    const today = new Date();
    const totalTimeline = start && end ? Math.max((end - start) / 86400000, 1) : 1;
    const elapsed = start ? Math.max(Math.min((today - start) / 86400000, totalTimeline), 0) : 0;
    const plannedProgressToday = (elapsed / totalTimeline) * 100 || 1;
    const overallProgress = Number(summary.overall_progress || 0);
    const totalPlannedCost = Number(summary.total_planned_cost || 0);

    res.json({
      overall_progress: overallProgress,
      budget_used_pct: plannedBudget > 0 ? (actualCost / plannedBudget) * 100 : 0,
      total_planned_cost: totalPlannedCost,
      total_actual_cost: actualCost,
      tasks_total: summary.tasks_total,
      tasks_done: summary.tasks_done,
      tasks_delayed: summary.tasks_delayed,
      tasks_in_progress: summary.tasks_in_progress,
      days_remaining: end ? Math.ceil((end - today) / 86400000) : 0,
      evm_spi: overallProgress / plannedProgressToday,
      evm_cpi: actualCost > 0 ? totalPlannedCost / actualCost : 0,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/projects/:project_id/tasks', authenticateToken, canManageTasks, async (req, res, next) => {
  try {
    const task = req.body;
    if (!task.name || !task.planned_start || !task.planned_end) {
      return res.status(400).json({ success: false, error: 'name, planned_start et planned_end sont requis.' });
    }
    const duration = computeDuration(task.planned_start, task.planned_end, task.duration_days);
    const { rows } = await pool.query(
      `INSERT INTO tasks (
        project_id, name, title, wbs_code, parent_task_id, planned_start, planned_end,
        duration_days, planned_cost, responsible_user_id, notes, dependencies, color,
        progress_percent, actual_cost, status
      )
      VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, '#378ADD'), 0, 0, 'not_started')
      RETURNING *`,
      [
        req.params.project_id,
        task.name,
        task.wbs_code || null,
        task.parent_task_id || null,
        task.planned_start,
        task.planned_end,
        duration,
        task.planned_cost || 0,
        task.responsible_user_id || null,
        task.notes || null,
        task.dependencies || null,
        task.color || null,
      ]
    );
    res.status(201).json({ success: true, task: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.patch('/tasks/:task_id', authenticateToken, canManageTasks, async (req, res, next) => {
  const allowed = [
    'progress_percent', 'actual_cost', 'actual_start', 'actual_end', 'status', 'notes',
    'planned_start', 'planned_end', 'duration_days', 'responsible_user_id',
    'name', 'wbs_code', 'parent_task_id', 'color',
  ];
  const entries = Object.entries(req.body).filter(([key]) => allowed.includes(key));
  if (!entries.length) return res.status(400).json({ success: false, error: 'Aucun champ valide à mettre à jour.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM tasks WHERE id = $1', [req.params.task_id]);
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Tâche introuvable.' });
    }

    const merged = { ...current.rows[0], ...req.body };
    if ((req.body.planned_start || req.body.planned_end) && req.body.duration_days === undefined) {
      req.body.duration_days = computeDuration(merged.planned_start, merged.planned_end);
      entries.push(['duration_days', req.body.duration_days]);
    }
    if (req.body.name !== undefined) entries.push(['title', req.body.name]);

    const uniqueEntries = entries.filter(([key], index, arr) => arr.findIndex(([k]) => k === key) === index);
    const sets = uniqueEntries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
    const values = uniqueEntries.map(([, value]) => value === '' ? null : value);
    const updated = await client.query(
      `UPDATE tasks SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1} RETURNING *`,
      [...values, req.params.task_id]
    );
    await updateProjectActualCost(client, updated.rows[0].project_id);
    await client.query('COMMIT');
    res.json({ success: true, task: updated.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.delete('/tasks/:task_id', authenticateToken, canDeleteTasks, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const project = await client.query('SELECT project_id FROM tasks WHERE id = $1', [req.params.task_id]);
    if (!project.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Tâche introuvable.' });
    }
    const deleted = await client.query(
      `WITH RECURSIVE tree AS (
        SELECT id FROM tasks WHERE id = $1
        UNION ALL
        SELECT t.id FROM tasks t INNER JOIN tree ON t.parent_task_id = tree.id
      )
      DELETE FROM tasks WHERE id IN (SELECT id FROM tree) RETURNING id`,
      [req.params.task_id]
    );
    await updateProjectActualCost(client, project.rows[0].project_id);
    await client.query('COMMIT');
    res.json({ success: true, deleted_count: deleted.rowCount });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
