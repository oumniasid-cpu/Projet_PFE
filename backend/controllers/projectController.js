const pool = require('../db');

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../db.js');

// Récupérer tous les projets DE L'UTILISATEUR CONNECTÉ
exports.getAllProjects = async (req, res) => {
  try {
    const userId = req.user.id; // ⚠️ adjust if your JWT payload uses a different key
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
      WHERE p.owner_id = $1
      ORDER BY p.created_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Récupérer un projet par ID (uniquement si l'utilisateur en est le propriétaire)
exports.getProjectById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id; // ⚠️ adjust if your JWT payload uses a different key
  try {
    const query = `
      SELECT p.*, u.name as owner_name,
      COALESCE(p.planned_budget, p.budget_total, 0) as planned_budget,
      COALESCE(p.actual_cost, p.budget_spent, 0) as actual_cost,
      COALESCE(progress_calc.overall_progress, p.progress, 0) as overall_progress,
      COALESCE(progress_calc.overall_progress, p.progress, 0) as progress,
      COALESCE(p.planned_budget, p.budget_total, 0) as budget_total,
      COALESCE(p.actual_cost, p.budget_spent, 0) as budget_spent
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
      WHERE p.id = $1 AND p.owner_id = $2
    `;
    const result = await pool.query(query, [id, userId]);

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

exports.importMPP = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier téléchargé" });
  }

  const filePath = req.file.path;
  const scriptPath = path.join(__dirname, '../scripts/mpp_parser.py');

  exec(`python "${scriptPath}" "${filePath}"`, async (error, stdout, stderr) => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (error) {
      console.error("Erreur d'exécution Python:", error);
      return res.status(500).json({ error: "Le script Python a échoué. Vérifiez l'installation de mpxj." });
    }

    try {
      const tasks = JSON.parse(stdout);

      const insertPromises = tasks.map(task => {
        const query = `
          INSERT INTO projects (name, start_date, end_date, progress, budget_total) 
          VALUES ($1, $2, $3, $4, $5)
        `;
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