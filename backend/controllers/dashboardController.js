const pool = require('../db');
const { getProjectVisibility, projectVisibilityClause } = require('../utils/projectVisibility');
const { markAlertRead } = require('../services/alertsService');

// Sous-requête réutilisée partout où on a besoin de l'avancement d'un
// projet : identique à projectController.getProjectById (moyenne pondérée
// par durée des progress_percent des tâches). Sans ça, le dashboard lisait
// la colonne projects.progress, jamais mise à jour, d'où le "0%" affiché
// alors que la page projet montre 23% (calculé en direct depuis les tâches).
const PROGRESS_JOIN = `
  LEFT JOIN LATERAL (
    SELECT ROUND(
      SUM(COALESCE(t.progress_percent, 0) * GREATEST(COALESCE(t.duration_days, 1), 1))
      / NULLIF(SUM(GREATEST(COALESCE(t.duration_days, 1), 1)), 0)
    )::int AS overall_progress
    FROM tasks t
    WHERE t.project_id = p.id
  ) progress_calc ON true
`;
const PROGRESS_EXPR = `COALESCE(progress_calc.overall_progress, p.progress, 0)`;

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

    // Total réel des projets visibles par l'utilisateur (même scope,
    // donc respecte bien "seulement les projets liés à cet utilisateur").


    const totalProjects = await pool.query(
      `SELECT COUNT(*) FROM projects p WHERE ${scope}`,
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

    // Moyenne du VRAI avancement (calculé depuis les tâches), pas de la
    // colonne stockée.
    const avgProgress = await pool.query(
      `SELECT COALESCE(ROUND(AVG(${PROGRESS_EXPR})), 0) AS avg_progress
       FROM projects p
       ${PROGRESS_JOIN}
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

    // BarChart "Avancement par Projet" : même calcul que la page projet.
    const progressProjects = await pool.query(
      `SELECT
         p.name,
         ${PROGRESS_EXPR} AS progress
       FROM projects p
       ${PROGRESS_JOIN}
       WHERE ${scope}
       ORDER BY p.updated_at DESC
       LIMIT 4`,
      [seesAll, userId]
    );

    res.json({
      metrics: {
        active_projects: parseInt(activeProjects.rows[0].count),
        total_projects: parseInt(totalProjects.rows[0].count),
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

    // 1) Somme des coûts par mois de fin planifiée (une tâche = un mois)
    // 2) Cumul mois par mois via SUM() OVER (ORDER BY period) — c'est ce
    //    cumul qui rend le graphe "Dépenses cumulées vs budget prévu" réel,
    //    au lieu du regroupement par mois de création de projet d'avant.
    const history = await pool.query(
      `WITH monthly AS (
         SELECT
           TO_CHAR(t.planned_end, 'YYYY-MM') AS period,
           TO_CHAR(t.planned_end, 'Mon YY')  AS month,
           COALESCE(SUM(t.planned_cost), 0)  AS month_budget,
           COALESCE(SUM(t.actual_cost), 0)   AS month_spent
         FROM tasks t
         JOIN projects p ON p.id = t.project_id
         WHERE t.planned_end IS NOT NULL AND ${scope}
         GROUP BY period, month
       )
       SELECT
         period,
         month,
         SUM(month_budget) OVER (ORDER BY period) AS budget,
         SUM(month_spent)  OVER (ORDER BY period) AS spent
       FROM monthly
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

    // Table "Projets Récents" : même calcul d'avancement que
    // projectController.getProjectById, pour ne plus afficher 0% pendant
    // que la page projet affiche 23% pour le même projet.
    const projects = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.client_name AS client,
        ${PROGRESS_EXPR} AS progress,
        p.status,
        p.budget_total,
        p.budget_spent
      FROM projects p
      ${PROGRESS_JOIN}
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