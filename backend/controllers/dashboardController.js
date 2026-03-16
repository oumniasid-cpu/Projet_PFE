const pool = require('../db');


// =============================
// Dashboard Stats
// =============================
exports.getDashboardStats = async (req, res) => {
  try {

    const activeProjects = await pool.query(
      `SELECT COUNT(*) FROM projects WHERE status = 'active'`
    );

    const budget = await pool.query(
      `SELECT 
        COALESCE(SUM(budget_total),0) AS total_budget,
        COALESCE(SUM(budget_spent),0) AS total_spent
       FROM projects`
    );

    const avgProgress = await pool.query(
      `SELECT ROUND(AVG(progress),0) AS avg_progress FROM projects`
    );

    const alerts = await pool.query(
      `SELECT COUNT(*) 
       FROM projects 
       WHERE status IN ('at risk','delayed')`
    );

    const progressProjects = await pool.query(`
      SELECT name, progress
      FROM projects
      ORDER BY updated_at DESC
      LIMIT 4
    `);

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

    const history = await pool.query(`
      SELECT
        TO_CHAR(created_at,'Mon') AS month,
        SUM(budget_total) AS budget,
        SUM(budget_spent) AS spent
      FROM projects
      GROUP BY month
      ORDER BY MIN(created_at)
    `);

    res.json(history.rows);

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

    const projects = await pool.query(`
      SELECT
        id,
        name,
        client_name AS client,
        progress,
        status,
        budget_total,
        budget_spent
      FROM projects
      ORDER BY created_at DESC
      LIMIT 10
    `);

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
        title,
        status,
        start_date,
        due_date
      FROM tasks
      WHERE project_id = $1
      ORDER BY start_date
    `, [projectId]);

    res.json(tasks.rows);

  } catch (error) {
    console.error("Gantt error:", error);
    res.status(500).json({ message: "Server error" });
  }
};