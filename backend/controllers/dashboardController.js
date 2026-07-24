const pool = require('../db');

// =============================
// Dashboard Stats
// =============================
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Compte tous les projets "en cours" (pas terminés ni annulés)
    const activeProjects = await pool.query(`
      SELECT COUNT(*) 
      FROM projects 
      WHERE owner_id = $1
      AND status IN ('active', 'on track', 'at risk', 'delayed', 'planning', 'on-hold')
    `, [userId]);

    const budget = await pool.query(`
      SELECT 
        COALESCE(SUM(budget_total), 0) AS total_budget,
        COALESCE(SUM(budget_spent),  0) AS total_spent
      FROM projects
      WHERE owner_id = $1
    `, [userId]);

    const avgProgress = await pool.query(`
      SELECT COALESCE(ROUND(AVG(progress), 0), 0) AS avg_progress 
      FROM projects
      WHERE owner_id = $1
    `, [userId]);

    // Projets nécessitant attention
    const alerts = await pool.query(`
      SELECT COUNT(*) 
      FROM projects 
      WHERE owner_id = $1
      AND status IN ('at risk', 'delayed')
    `, [userId]);

    // Top 4 projets récents pour le bar chart
    const progressProjects = await pool.query(`
      SELECT name, progress
      FROM projects
      WHERE owner_id = $1
      ORDER BY created_at DESC
      LIMIT 4
    `, [userId]);

    res.json({
      metrics: {
        active_projects: parseInt(activeProjects.rows[0].count),
        total_budget: parseFloat(budget.rows[0].total_budget),
        total_spent: parseFloat(budget.rows[0].total_spent),
        avg_progress: parseInt(avgProgress.rows[0].avg_progress),
        alerts: parseInt(alerts.rows[0].count),
      },
      individualProgress: progressProjects.rows,
    });

  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Server error", detail: error.message });
  }
};


// =============================
// Budget History Chart
// =============================
exports.getBudgetHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await pool.query(`
      SELECT
        TO_CHAR(created_at, 'Mon YYYY')          AS month,
        SUM(budget_total)                         AS budget,
        SUM(budget_spent)                         AS spent
      FROM projects
      WHERE owner_id = $1
      GROUP BY 
        TO_CHAR(created_at, 'Mon YYYY'),
        DATE_TRUNC('month', created_at)
      ORDER BY 
        DATE_TRUNC('month', MIN(created_at))
    `, [userId]);

    res.json(history.rows);

  } catch (error) {
    console.error("Budget history error:", error);
    res.status(500).json({ message: "Server error", detail: error.message });
  }
};


// =============================
// Projects List
// =============================
exports.getProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await pool.query(`
      SELECT
        id,
        name,
        client_name  AS client,
        progress,
        status,
        budget_total,
        budget_spent
      FROM projects
      WHERE owner_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    res.json(projects.rows);

  } catch (error) {
    console.error("Projects error:", error);
    res.status(500).json({ message: "Server error", detail: error.message });
  }
};


// =============================
// Gantt Chart Data
// =============================
exports.getGanttData = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Vérifie d'abord que ce projet appartient bien à l'utilisateur
    const ownerCheck = await pool.query(
      `SELECT id FROM projects WHERE id = $1 AND owner_id = $2`,
      [projectId, userId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    const tasks = await pool.query(`
      SELECT
        id,
        title,
        status,
        start_date,
        due_date
      FROM tasks
      WHERE project_id = $1
      ORDER BY due_date
    `, [projectId]);

    res.json(tasks.rows);

  } catch (error) {
    console.error("Gantt error:", error);
    res.status(500).json({ message: "Server error", detail: error.message });
  }
};