// backend/controllers/dashboardController.js
const pool = require('../db');

// ─── GET /api/dashboard/stats ────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Tous les projets de l'utilisateur connecté
    const { rows: projects } = await pool.query(
      `SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    // 2. Calculs KPI
    const totalProjects  = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;

    const overallProgress = totalProjects > 0
      ? Math.round(projects.reduce((s, p) => s + parseInt(p.progress || 0), 0) / totalProjects)
      : 0;

    const budgetPlanned = projects.reduce((s, p) => s + parseFloat(p.budget_total || 0), 0);
    const budgetSpent   = projects.reduce((s, p) => s + parseFloat(p.budget_spent  || 0), 0);

    // 3. Prochain jalon
    const { rows: nextTasks } = await pool.query(
      `SELECT t.title, t.due_date, p.name AS project_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE p.owner_id = $1
         AND t.status != 'completed'
         AND t.due_date IS NOT NULL
         AND t.due_date >= CURRENT_DATE
       ORDER BY t.due_date ASC LIMIT 1`,
      [userId]
    );

    const nextMilestone    = nextTasks[0]?.title        || null;
    const milestoneDate    = nextTasks[0]?.due_date     || null;
    const milestoneProject = nextTasks[0]?.project_name || null;

    // 4. Alertes automatiques
    const alerts = [];
    projects.forEach(p => {
      const isDelayed = new Date(p.end_date) < new Date() && parseInt(p.progress) < 100;
      if (isDelayed) {
        alerts.push({
          type: 'error',
          title: `${p.name} — En retard`,
          message: `Prévu le ${new Date(p.end_date).toLocaleDateString('fr-FR')}, avancement : ${p.progress}%.`,
        });
      }
      const spent   = parseFloat(p.budget_spent || 0);
      const planned = parseFloat(p.budget_total || 0);
      if (planned > 0 && spent > planned) {
        alerts.push({
          type: 'error',
          title: `Dépassement budget — ${p.name}`,
          message: `+${Math.round(((spent - planned) / planned) * 100)}% au-dessus du prévu.`,
        });
      } else if (planned > 0 && spent / planned > 0.85) {
        alerts.push({
          type: 'warning',
          title: `Budget critique — ${p.name}`,
          message: `${Math.round((spent / planned) * 100)}% du budget consommé.`,
        });
      }
    });

    if (alerts.length === 0) {
      alerts.push({
        type: 'info',
        title: 'Aucune alerte',
        message: 'Tous vos projets sont sur la bonne voie ! Continuez comme ça.',
      });
    }

    // 5. Réponse — structure PLATE et cohérente
    res.json({
      overallProgress,
      budgetSpent,
      budgetPlanned,
      totalProjects,
      activeProjects,
      nextMilestone,
      milestoneDate,
      milestoneProject,
      alerts,
    });

  } catch (err) {
    console.error('[getDashboardStats]', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─── GET /api/dashboard/budget-history ──────────────────────
exports.getBudgetHistory = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', start_date), 'Mon YY') AS month,
         DATE_TRUNC('month', start_date)                    AS month_date,
         SUM(budget_spent)                                  AS budget
       FROM projects
       WHERE owner_id = $1
       GROUP BY DATE_TRUNC('month', start_date)
       ORDER BY month_date ASC`,
      [req.user.id]
    );

    const lastBudget  = rows.length > 0 ? Number(rows[rows.length - 1].budget) : 0;
    const avgMonthly  = rows.length > 0
      ? rows.reduce((s, r) => s + Number(r.budget), 0) / rows.length : 0;
    const lastDate    = rows.length > 0
      ? new Date(rows[rows.length - 1].month_date) : new Date();

    const predictions = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + i + 1);
      return {
        month:      d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        budget:     null,
        prediction: Math.round(lastBudget + avgMonthly * (i + 1)),
      };
    });

    const history = [
      ...rows.map(r => ({
        month:      r.month,
        budget:     Number(r.budget),
        prediction: Number(r.budget),
      })),
      ...predictions,
    ];

    res.json({ history });
  } catch (err) {
    console.error('[getBudgetHistory]', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─── GET /api/dashboard/projects ────────────────────────────
exports.getProjects = async (req, res) => {
  try {
    const { status, search } = req.query;
    const params  = [req.user.id];
    let   filters = '';

    if (status && status !== 'all') {
      params.push(status);
      filters += ` AND p.status = $${params.length}`;
    }
    if (search?.trim()) {
      params.push(`%${search.trim()}%`);
      filters += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }

    const { rows } = await pool.query(
      `SELECT
         p.id, p.name, p.description, p.status, p.progress,
         p.budget_total, p.budget_spent,
         p.start_date, p.end_date,
         p.location_address, p.location_city,
         CASE WHEN p.end_date < CURRENT_DATE AND p.progress < 100
              THEN true ELSE false END                       AS is_delayed,
         COUNT(t.id)                                         AS tasks_total,
         COUNT(t.id) FILTER (WHERE t.status = 'completed')  AS tasks_done,
         (SELECT title FROM tasks
          WHERE project_id = p.id AND status != 'completed'
            AND due_date IS NOT NULL
          ORDER BY due_date ASC LIMIT 1)                     AS next_milestone
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.owner_id = $1 ${filters}
       GROUP BY p.id
       ORDER BY p.start_date ASC`,
      params
    );

    const projects = rows.map(p => ({
      id:            p.id,
      name:          p.name,
      description:   p.description || '',
      status:        p.status,
      progress:      Number(p.progress),
      budgetSpent:   Number(p.budget_spent),
      budgetPlanned: Number(p.budget_total),
      startDate:     p.start_date,
      endDate:       p.end_date,
      isDelayed:     p.is_delayed,
      location:      [p.location_address, p.location_city].filter(Boolean).join(', ') || null,
      tasks:         { total: Number(p.tasks_total), done: Number(p.tasks_done) },
      nextMilestone: p.next_milestone || null,
    }));

    res.json({ projects, total: projects.length });
  } catch (err) {
    console.error('[getProjects]', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

// ─── GET /api/dashboard/gantt ────────────────────────────────
exports.getGantt = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, status, progress, start_date, end_date,
              CASE WHEN end_date < CURRENT_DATE AND progress < 100
                   THEN true ELSE false END AS is_delayed
       FROM projects
       WHERE owner_id = $1
         AND status IN ('active', 'planning', 'on-hold')
         AND end_date   >= (CURRENT_DATE - INTERVAL '1 month')
         AND start_date <= (CURRENT_DATE + INTERVAL '6 months')
       ORDER BY start_date ASC`,
      [req.user.id]
    );

    const projects = rows.map(p => ({
      id:        p.id,
      name:      p.name,
      status:    p.status,
      progress:  Number(p.progress),
      startDate: p.start_date,
      endDate:   p.end_date,
      isDelayed: p.is_delayed,
    }));

    res.json({ projects });
  } catch (err) {
    console.error('[getGantt]', err);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};