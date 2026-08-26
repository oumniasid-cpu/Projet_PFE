const pool = require('../db');
const { getProjectVisibility, projectVisibilityClause } = require('../utils/projectVisibility');
const { markAlertRead } = require('../services/alertsService');


// =============================
// Dashboard Stats
// =============================
exports.getDashboardStats = async (req, res) => {
  try {
    const { seesAll, userId } = await getProjectVisibility(req.user.id);
    const scope = projectVisibilityClause(1, 2);

    const activeProjects = await pool.query(
      `SELECT COUNT(*) FROM projects p WHERE p.status = 'active' AND ${scope}`,
      [seesAll, userId]
    );

    const budget = await pool.query(
      `SELECT
        COALESCE(SUM(p.budget_total),0) AS total_budget,
        COALESCE(SUM(p.budget_spent),0) AS total_spent
       FROM projects p
       WHERE ${scope}`,
      [seesAll, userId]
    );

    const avgProgress = await pool.query(
      `SELECT COALESCE(ROUND(AVG(p.progress),0), 0) AS avg_progress
       FROM projects p
       WHERE ${scope}`,
      [seesAll, userId]
    );

    // Compte les alertes ACTIVES (non résolues) de la vraie table `alerts`,
    // limitées aux projets visibles par l'utilisateur (même scope que le
    // reste du dashboard). Remplace l'ancien proxy basé sur project.status.
    const alerts = await pool.query(
      `SELECT COUNT(*)
       FROM alerts a
       JOIN projects p ON p.id = a.project_id
       WHERE a.is_resolved = FALSE AND ${scope}`,
      [seesAll, userId]
    );

    const progressProjects = await pool.query(
      `SELECT p.name, p.progress
       FROM projects p
       WHERE ${scope}
       ORDER BY p.updated_at DESC
       LIMIT 4`,
      [seesAll, userId]
    );

    res.json({
      metrics: {
        active_projects: parseInt(activeProjects.rows[0].count),
        total_budget: parseFloat(budget.rows[0].total_budget),
        total_spent: parseFloat(budget.rows[0].total_spent),
        avg_progress: parseInt(avgProgress.rows[0].avg_progress),
        alerts: parseInt(alerts.rows[0].count)
      },
      individualProgress: progressProjects.rows
    });

  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



/* =============================
   Budget History Chart
   ============================= */

exports.getBudgetHistory = async (req, res) => {
  try {
    const { seesAll, userId } = await getProjectVisibility(req.user.id);
    const scope = projectVisibilityClause(1, 2);

    const history = await pool.query(
      `SELECT
        TO_CHAR(p.created_at, 'YYYY-MM')  AS period,
        TO_CHAR(p.created_at, 'Mon YY')   AS month,
        COALESCE(SUM(p.budget_total), 0)  AS budget,
        COALESCE(SUM(p.budget_spent), 0)  AS spent
      FROM projects p
      WHERE ${scope}
      GROUP BY period, month
      ORDER BY period`,
      [seesAll, userId]
    );

    res.json(history.rows.map(r => ({
      month:  r.month,
      budget: parseFloat(r.budget),
      spent:  parseFloat(r.spent),
    })));

  } catch (error) {
    console.error("Budget history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



/* =============================
   Projects List
   ============================= */

exports.getProjects = async (req, res) => {
  try {
    const { seesAll, userId } = await getProjectVisibility(req.user.id);
    const scope = projectVisibilityClause(1, 2);

    const projects = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.client_name AS client,
        p.progress,
        p.status,
        p.budget_total,
        p.budget_spent
      FROM projects p
      WHERE ${scope}
      ORDER BY p.created_at DESC
      LIMIT 10`,
      [seesAll, userId]
    );

    res.json(projects.rows);

  } catch (error) {
    console.error("Projects error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



/* =============================
   Gantt Chart Data
   ============================= */

exports.getGanttData = async (req, res) => {
  try {

    const { projectId } = req.params;

    const tasks = await pool.query(`
      SELECT
        id,
        COALESCE(name, title)  AS name,
        status,
        planned_start,
        planned_end,
        progress_percent
      FROM tasks
      WHERE project_id = $1
      ORDER BY planned_start NULLS LAST
    `, [projectId]);

    res.json(tasks.rows);

  } catch (error) {
    console.error("Gantt error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



/* =============================
   Alerts (dashboard global — tous projets visibles par l'utilisateur)
   ============================= */

// GET /api/dashboard/alerts
exports.getDashboardAlerts = async (req, res) => {
  try {
    const { seesAll, userId } = await getProjectVisibility(req.user.id);
    const scope = projectVisibilityClause(1, 2);

    const alerts = await pool.query(
      `SELECT
         a.id, a.project_id, a.indicator, a.severity, a.threshold,
         a.indicator_value, a.message, a.is_read, a.is_resolved, a.created_at,
         p.name AS project_name
       FROM alerts a
       JOIN projects p ON p.id = a.project_id
       WHERE a.is_resolved = FALSE AND ${scope}
       ORDER BY a.severity = 'critical' DESC, a.created_at DESC
       LIMIT 10`,
      [seesAll, userId]
    );

    res.json(alerts.rows);

  } catch (error) {
    console.error("Dashboard alerts error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/dashboard/alerts/:alertId/read
exports.markDashboardAlertRead = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { seesAll, userId } = await getProjectVisibility(req.user.id);
    const scope = projectVisibilityClause(2, 3);

    // On vérifie que l'alerte appartient bien à un projet visible par
    // l'utilisateur avant de la marquer comme lue (pas de fuite entre comptes).
    const owned = await pool.query(
      `SELECT a.id
       FROM alerts a
       JOIN projects p ON p.id = a.project_id
       WHERE a.id = $1 AND ${scope}`,
      [alertId, seesAll, userId]
    );

    if (owned.rows.length === 0) {
      return res.status(404).json({ message: "Alerte introuvable" });
    }

    const updated = await markAlertRead(pool, alertId);
    res.json(updated);

  } catch (error) {
    console.error("Mark alert read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};