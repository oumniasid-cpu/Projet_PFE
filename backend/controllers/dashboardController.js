const pool = require('../db');
// backend/controllers/dashboardController.js

exports.getDashboardStats = async (req, res) => { /* ... */ }; // ✅ Doit exister
exports.getBudgetHistory = async (req, res) => { /* ... */ };  // ✅ Doit exister
exports.getProjects = async (req, res) => { /* ... */ };       // ✅ Doit exister
exports.getGantt = async (req, res) => { /* ... */ };          // ✅ Doit exister
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id; // On filtre par l'utilisateur connecté

    // 1. Métriques globales (KPI)
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('active', 'on track')) as active_projects,
        COALESCE(SUM(budget_total), 0) as total_budget,
        COALESCE(AVG(progress), 0) as avg_progress,
        COUNT(*) FILTER (WHERE status IN ('at risk', 'delayed')) as alerts_count
      FROM projects
      WHERE owner_id = $1;
    `;

    // 2. Évolution du budget (Données pour le graphique AreaChart)
    const budgetTrendQuery = `
      SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        SUM(budget_total) as budget,
        SUM(budget_spent) as spent,
        DATE_TRUNC('month', created_at) as month_date
      FROM projects
      WHERE owner_id = $1
      GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
      ORDER BY month_date ASC
      LIMIT 6;
    `;

    // 3. Progrès individuel (Top 4 projets récents)
    const projectProgressQuery = `
      SELECT name, progress, status 
      FROM projects 
      WHERE owner_id = $1
      ORDER BY updated_at DESC 
      LIMIT 4;
    `;

    const [statsResult, trendResult, progressResult] = await Promise.all([
      pool.query(statsQuery, [userId]),
      pool.query(budgetTrendQuery, [userId]),
      pool.query(projectProgressQuery, [userId])
    ]);

    res.status(200).json({
      metrics: {
        active_projects: parseInt(statsResult.rows[0].active_projects),
        total_budget: parseFloat(statsResult.rows[0].total_budget),
        avg_progress: Math.round(parseFloat(statsResult.rows[0].avg_progress)),
        alerts: parseInt(statsResult.rows[0].alerts_count)
      },
      budgetHistory: trendResult.rows.map(row => ({
        month: row.month,
        budget: parseFloat(row.budget),
        spent: parseFloat(row.spent)
      })),
      individualProgress: progressResult.rows.map(row => ({
        name: row.name,
        progress: parseInt(row.progress),
        status: row.status
      }))
    });

  } catch (err) {
    console.error('[getDashboardStats Error]:', err);
    res.status(500).json({ message: 'Erreur serveur lors du calcul des statistiques' });
  }
};


//gantt chart back part:)
// Récupérer les données pour le Gantt d'un projet spécifique
exports.getGanttData = async (req, res) => {
  const { projectId } = req.params;
  try {
    // Ici, on récupère soit les tâches du projet, soit le projet lui-même
    // Si vous avez une table 'tasks', remplacez la requête.
    const query = `
      SELECT id, name, start_date, end_date, progress, status 
      FROM projects 
      WHERE id = $1 OR parent_project_id = $1 
      ORDER BY start_date ASC
    `;
    const result = await pool.query(query, [projectId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération du Gantt" });
  }
};