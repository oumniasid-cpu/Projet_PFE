const pool = require('../db'); // Votre configuration de connexion pg

// 1. Récupérer les projets pour le SELECT du frontend
exports.getProjectsForDropdown = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name FROM projects ORDER BY name ASC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des projets" });
    }
};

// 2. Créer le rapport (Le project_id est obligatoire)
exports.createDailyReport = async (req, res) => {
    const { project_id, content, tasks } = req.body;
    const author_id = req.user.id; // Récupéré via votre middleware d'auth

    if (!project_id) {
        return res.status(400).json({ error: "Vous devez sélectionner un projet." });
    }

    try {
        const query = `
            INSERT INTO daily_reports (project_id, author_id, content, tasks)
            VALUES ($1, $2, $3, $4)
            RETURNING *`;
        
        const values = [project_id, author_id, content, JSON.stringify(tasks)];
        const result = await pool.query(query, values);
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erreur lors de l'enregistrement du rapport" });
    }
};

// controllers/reportController.js
exports.getReportsByProject = async (req, res) => {
    const { projectId } = req.params;
    try {
        const query = `
            SELECT 
                r.id, 
                r.report_date, 
                u.name as author_name,
                jsonb_array_length(r.tasks) as tasks_count
            FROM daily_reports r
            JOIN users u ON r.author_id = u.id
            WHERE r.project_id = $1
            ORDER BY r.report_date DESC;
        `;
        const result = await pool.query(query, [projectId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
};