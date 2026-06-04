const pool = require('../db');

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../db.js');

// Récupérer tous les projets
exports.getAllProjects = async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC;
    `;
    const { rows } = await pool.query(query);
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
    const query = `
      SELECT p.*, u.name as owner_name 
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    res.json(result.rows[0]);
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