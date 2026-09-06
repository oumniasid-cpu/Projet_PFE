const pool = require('../db');
const { getProjectVisibility, projectVisibilityClause } = require('../utils/projectVisibility');
const { listAlerts } = require('../services/alertsService');

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../db.js');

// La base autorise 2 conventions de statut en parallèle sur `tasks.status`
// (ancien import : todo/in-progress/completed — nouveau : not_started/
// in_progress/done/delayed, voir la contrainte CHECK réelle de la table).
// On normalise systématiquement vers 3 buckets pour que les statistiques ne
// perdent silencieusement aucune tâche.
const STATUS_MAP = {
  todo: 'not_started',
  not_started: 'not_started',
  'in-progress': 'in_progress',
  in_progress: 'in_progress',
  delayed: 'in_progress', // en retard mais toujours en cours, pas "not_started"
  completed: 'done',
  done: 'done',
};
const normalizeStatus = (s) => STATUS_MAP[s] || 'not_started';

// Récupérer les projets visibles par l'utilisateur connecté
// (les siens + ceux où il est membre ; tout, s'il est admin/maître d'ouvrage)
exports.getAllProjects = async (req, res) => {
  try {
    const { seesAll, userId } = await getProjectVisibility(req.user.id);

    const query = `
      SELECT p.*, u.name as owner_name,
      COALESCE(p.planned_budget, p.budget_total, 0) as planned_budget,
      COALESCE(p.actual_cost, p.budget_spent, 0) as actual_cost,
      COALESCE(progress_calc.overall_progress, p.progress, 0) as overall_progress,
      COALESCE(progress_calc.overall_progress, p.progress, 0) as progress,
      COALESCE(p.planned_budget, p.budget_total, 0) as budget_total,
      COALESCE(p.actual_cost, p.budget_spent, 0) as budget_spent,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN LATERAL (
        SELECT ROUND(
          SUM(COALESCE(t.progress_percent, 0) * GREATEST(COALESCE(t.duration_days, 1), 1))
          / NULLIF(SUM(GREATEST(COALESCE(t.duration_days, 1), 1)), 0)
        )::int as overall_progress
        FROM tasks t
        WHERE t.project_id = p.id
      ) progress_calc ON true
      WHERE ${projectVisibilityClause(1, 2)}
      ORDER BY p.created_at DESC;
    `;
    const { rows } = await pool.query(query, [seesAll, userId]);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Récupérer un projet par ID (Correction de la requête)
exports.getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const { seesAll, userId } = await getProjectVisibility(req.user.id);

    const query = `
      SELECT p.*, u.name as owner_name,
      COALESCE(p.planned_budget, p.budget_total, 0) as planned_budget,
      COALESCE(p.actual_cost, p.budget_spent, 0) as actual_cost,
      COALESCE(progress_calc.overall_progress, p.progress, 0) as overall_progress,
      COALESCE(progress_calc.overall_progress, p.progress, 0) as progress,
      COALESCE(p.planned_budget, p.budget_total, 0) as budget_total,
      COALESCE(p.actual_cost, p.budget_spent, 0) as budget_spent,
      COALESCE(cost_calc.cost_progress_pct, 0) as cost_progress_pct
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN LATERAL (
        SELECT ROUND(
          SUM(COALESCE(t.progress_percent, 0) * GREATEST(COALESCE(t.duration_days, 1), 1))
          / NULLIF(SUM(GREATEST(COALESCE(t.duration_days, 1), 1)), 0)
        )::int as overall_progress
        FROM tasks t
        WHERE t.project_id = p.id
      ) progress_calc ON true
      LEFT JOIN LATERAL (
        SELECT ROUND(
          COALESCE(SUM(t.planned_cost) FILTER (WHERE t.status = 'done'), 0)
          / NULLIF(COALESCE(p.planned_budget, p.budget_total, 0), 0) * 100
        )::int as cost_progress_pct
        FROM tasks t
        WHERE t.project_id = p.id
      ) cost_calc ON true
      WHERE p.id = $1 AND ${projectVisibilityClause(2, 3)}
    `;
    const result = await pool.query(query, [id, seesAll, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    const tasksResult = await pool.query(
      `SELECT
        id, project_id, parent_task_id, wbs_code,
        COALESCE(name, title) as name,
        planned_start, planned_end, actual_start, actual_end,
        duration_days, progress_percent, planned_cost, actual_cost,
        responsible_user_id, status, created_at
      FROM tasks
      WHERE project_id = $1
      ORDER BY COALESCE(wbs_code, id::text), id`,
      [id]
    );

    res.json({ ...result.rows[0], tasks: tasksResult.rows });
  } catch (err) {
    console.error('Error fetching project by ID:', err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /api/projects/:id/analytics/task-status
// Répartition réelle des tâches de CE projet par statut normalisé
// (not_started / in_progress / done).
exports.getTaskStatusDistribution = async (req, res) => {
  const { id } = req.params;
  try {
    const { seesAll, userId } = await getProjectVisibility(req.user.id);
    const scope = projectVisibilityClause(2, 3);

    const owned = await pool.query(
      `SELECT p.id FROM projects p WHERE p.id = $1 AND ${scope}`,
      [id, seesAll, userId]
    );
    if (owned.rows.length === 0) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM tasks
       WHERE project_id = $1
       GROUP BY status`,
      [id]
    );

    const distribution = { not_started: 0, in_progress: 0, done: 0 };
    rows.forEach((r) => {
      distribution[normalizeStatus(r.status)] += r.count;
    });

    res.json(distribution);
  } catch (err) {
    console.error('Task status distribution error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Calcule toutes les données de l'onglet Analytics pour un projet donné.
// Utilisée par getProjectAnalytics (endpoint consolidé) ET par les 2
// endpoints dédiés attendus par ProjectDetails.jsx (progress-over-time,
// budget-breakdown), pour ne jamais dupliquer la logique SQL/EVM.
// Retourne `null` si le projet n'existe pas ou n'est pas visible par l'utilisateur.
async function computeProjectAnalytics(userId_req, id) {
  const { seesAll, userId } = await getProjectVisibility(userId_req);
  const scope = projectVisibilityClause(2, 3);

  const projectResult = await pool.query(
    `SELECT p.id, p.start_date, p.end_date FROM projects p WHERE p.id = $1 AND ${scope}`,
    [id, seesAll, userId]
  );
  if (projectResult.rows.length === 0) return null;
  const project = projectResult.rows[0];

  const tasksResult = await pool.query(
    `SELECT status, planned_cost, actual_cost, progress_percent, planned_start, planned_end,
            actual_end, COALESCE(name, title) AS name
     FROM tasks WHERE project_id = $1`,
    [id]
  );
  const tasks = tasksResult.rows;

  // 1. Répartition par statut (normalisée)
  const taskStatus = { not_started: 0, in_progress: 0, done: 0 };
  tasks.forEach((t) => {
    taskStatus[normalizeStatus(t.status)]++;
  });

  // 2. Budget par tâche — les 6 tâches les plus coûteuses (lisibilité du graphique)
  const budgetByTask = [...tasks]
    .filter((t) => Number(t.planned_cost) > 0)
    .sort((a, b) => Number(b.planned_cost) - Number(a.planned_cost))
    .slice(0, 6)
    .map((t) => ({
      name: t.name,
      estimated: Number(t.planned_cost) || 0,
      actual: Number(t.actual_cost) || 0,
    }));

  // 3. Courbe progression réelle vs planifiée (style VP/VA du moteur EVM),
  // sur 8 points répartis entre le début et la fin du projet.
  // NOTE HONNÊTE : sans historique quotidien sauvegardé, on ne peut pas
  // reconstituer un vrai historique jour par jour de l'avancement réel.
  // "target" est exact (calcul VP classique). "actual" n'est renseigné
  // que pour les points déjà passés, via le progress_percent ACTUEL des
  // tâches déjà censées être terminées à cette date — une approximation
  // raisonnable, pas un historique réel.
  const bac = tasks.reduce((s, t) => s + (Number(t.planned_cost) || 0), 0);
  const today = new Date();
  const start = project.start_date ? new Date(project.start_date) : null;
  const end = project.end_date ? new Date(project.end_date) : null;
  const progressCurve = [];
  if (start && end && end > start) {
    const numPoints = 8;
    for (let i = 1; i <= numPoints; i++) {
      const frac = i / numPoints;
      const checkDate = new Date(start.getTime() + frac * (end - start));

      let vp = 0;
      tasks.forEach((t) => {
        const cost = Number(t.planned_cost) || 0;
        if (!t.planned_start || !t.planned_end) return;
        const ts = new Date(t.planned_start);
        const te = new Date(t.planned_end);
        let f = 0;
        if (checkDate >= te) f = 1;
        else if (checkDate > ts && te > ts) f = (checkDate - ts) / (te - ts);
        vp += cost * f;
      });

      const isPast = checkDate <= today;
      let va = 0;
      if (isPast) {
        tasks.forEach((t) => {
          const cost = Number(t.planned_cost) || 0;
          const te = t.planned_end ? new Date(t.planned_end) : null;
          if (te && checkDate >= te) va += cost * (Number(t.progress_percent || 0) / 100);
        });
      }

      progressCurve.push({
        label: checkDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        target: bac ? Math.round((vp / bac) * 100) : 0,
        actual: isPast ? (bac ? Math.round((va / bac) * 100) : 0) : null,
      });
    }
  }

  // 4. Taux de respect des délais (basé sur les dates, pas le statut brut
  // — insensible aux deux conventions de nommage de `status`)
  const delayedCount = tasks.filter((t) => {
    const plannedEnd = t.planned_end ? new Date(t.planned_end) : null;
    const actualEnd = t.actual_end ? new Date(t.actual_end) : null;
    if (!plannedEnd) return false;
    if (actualEnd) return actualEnd > plannedEnd;
    return normalizeStatus(t.status) !== 'done' && plannedEnd < today;
  }).length;
  const onTimeRate = tasks.length > 0
    ? Math.round(((tasks.length - delayedCount) / tasks.length) * 100)
    : null;

  // 5. Nombre de rapports journaliers soumis pour ce projet CE TRIMESTRE
  // (le frontend affiche ce chiffre sous le libellé "This quarter" —
  // on filtre donc réellement par trimestre au lieu de compter le total).
  const reportsResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM daily_reports
     WHERE project_id = $1 AND report_date >= date_trunc('quarter', CURRENT_DATE)`,
    [id]
  );

  return {
    taskStatus,
    budgetByTask,
    progressCurve,
    onTimeRate,
    reportsCount: reportsResult.rows[0].count,
    taskCount: tasks.length,
  };
}

// GET /api/projects/:id/analytics
// Endpoint consolidé pour tout l'onglet Analytics (un seul aller-retour
// réseau au lieu de plusieurs) : répartition des tâches, budget par tâche,
// courbe progression réelle vs planifiée, taux de respect des délais,
// nombre de rapports journaliers soumis.
exports.getProjectAnalytics = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await computeProjectAnalytics(req.user.id, id);
    if (!data) return res.status(404).json({ message: "Projet non trouvé" });
    res.json(data);
  } catch (err) {
    console.error('Project analytics error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// GET /api/projects/:id/analytics/progress-over-time
// Réutilise computeProjectAnalytics et reformate progressCurve
// ({label, target, actual}[]) vers la forme attendue par ProjectDetails.jsx
// ({labels, actual, target}) — remplace les données statiques de démo.
exports.getProgressOverTime = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await computeProjectAnalytics(req.user.id, id);
    if (!data) return res.status(404).json({ message: "Projet non trouvé" });
    res.json({
      labels: data.progressCurve.map((p) => p.label),
      actual: data.progressCurve.map((p) => p.actual),
      target: data.progressCurve.map((p) => p.target),
    });
  } catch (err) {
    console.error('Progress over time error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// GET /api/projects/:id/analytics/budget-breakdown
// Réutilise computeProjectAnalytics et reformate budgetByTask
// ({name, estimated, actual}[]) vers la forme attendue par ProjectDetails.jsx
// ({labels, estimated, actual}) — remplace les données statiques de démo.
exports.getBudgetBreakdown = async (req, res) => {
  const { id } = req.params;
  try {
    const data = await computeProjectAnalytics(req.user.id, id);
    if (!data) return res.status(404).json({ message: "Projet non trouvé" });
    res.json({
      labels: data.budgetByTask.map((b) => b.name),
      estimated: data.budgetByTask.map((b) => b.estimated),
      actual: data.budgetByTask.map((b) => b.actual),
    });
  } catch (err) {
    console.error('Budget breakdown error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// GET /api/projects/:id/alerts
// Alertes EVM (IPC/IPD) réellement enregistrées pour CE projet — remplace
// la fausse alerte statique "Supply chain logistics... 4 days behind".
exports.getProjectAlerts = async (req, res) => {
  const { id } = req.params;
  try {
    const { seesAll, userId } = await getProjectVisibility(req.user.id);
    const scope = projectVisibilityClause(2, 3);

    const owned = await pool.query(
      `SELECT p.id FROM projects p WHERE p.id = $1 AND ${scope}`,
      [id, seesAll, userId]
    );
    if (owned.rows.length === 0) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    const alerts = await listAlerts(pool, id, { unreadOnly: false });
    res.json(alerts);
  } catch (err) {
    console.error('Project alerts error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

exports.importMPP = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier téléchargé" });
  }

  const filePath = req.file.path;
  // Utilisation de path.join avec __dirname pour plus de sécurité
  const scriptPath = path.join(__dirname, '../scripts/mpp_parser.py');

  exec(`python "${scriptPath}" "${filePath}"`, async (error, stdout, stderr) => {
    // Supprimer le fichier temporaire immédiatement
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (error) {
      console.error("Erreur d'exécution Python:", error);
      return res.status(500).json({ error: "Le script Python a échoué. Vérifiez l'installation de mpxj." });
    }

    try {
      const tasks = JSON.parse(stdout);

      // Utilisation de transactions ou Promise.all pour PostgreSQL
      const insertPromises = tasks.map(task => {
        const query = `
          INSERT INTO projects (name, start_date, end_date, progress, budget_total) 
          VALUES ($1, $2, $3, $4, $5)
        `;
        // Mapping exact avec les clés JSON de mpp_parser.py
        const values = [
          task.name,
          task.start_date,
          task.end_date,
          task.progress,
          task.cost
        ];
        return pool.query(query, values);
      });

      await Promise.all(insertPromises);
      res.json({ message: "Import réussi", count: tasks.length });

    } catch (parseError) {
      console.error("Erreur parsing/DB:", parseError);
      res.status(500).json({ error: "Erreur lors de l'insertion en base de données" });
    }
  });
};

// ─── Créer un nouveau projet ─────────────────────────────
exports.createProject = async (req, res) => {
  const {
    name,
    description,
    status = 'planning',
    budget_total = 0,
    start_date,
    end_date,
    location_address,
    location_city,
    location_country,
    client_name,
    location,
    planned_budget,
  } = req.body;

  // Validation basique
  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: 'name, start_date et end_date sont requis.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO projects (
        name, description, status, budget_total, start_date, end_date,
        location_address, location_city, location_country,
        client_name, location, planned_budget, owner_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name,
        description || null,
        status,
        budget_total,
        start_date,
        end_date,
        location_address || null,
        location_city || null,
        location_country || null,
        client_name || null,
        location || null,
        planned_budget || null,
        req.user.id, // L'ID de l'utilisateur authentifié (owner_id)
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création du projet.' });
  }
};