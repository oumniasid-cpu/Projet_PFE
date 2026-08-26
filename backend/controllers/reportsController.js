const pool = require('../db');
const { getProjectVisibility, projectVisibilityClause } = require('../utils/projectVisibility');

// 1. Récupérer les projets pour le SELECT du frontend
// Filtré par visibilité : un utilisateur ne doit voir dans ce menu que les
// projets auxquels il a accès (même règle que le dashboard et /api/projects).
exports.getProjectsForDropdown = async (req, res) => {
    try {
        const { seesAll, userId } = await getProjectVisibility(req.user.id);
        const scope = projectVisibilityClause(1, 2);

        const result = await pool.query(
            `SELECT p.id, p.name
             FROM projects p
             WHERE ${scope}
             ORDER BY p.name ASC`,
            [seesAll, userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Projects dropdown error:', err);
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
        // Vérifie que l'utilisateur a le droit de soumettre un rapport sur CE
        // projet précis (pas seulement qu'il est connecté) — sinon n'importe
        // quel compte pourrait écrire des rapports sur des projets qu'il ne
        // devrait même pas voir.
        const { seesAll, userId } = await getProjectVisibility(req.user.id);
        const scope = projectVisibilityClause(2, 3);
        const allowed = await pool.query(
            `SELECT p.id FROM projects p WHERE p.id = $1 AND ${scope}`,
            [project_id, seesAll, userId]
        );
        if (allowed.rows.length === 0) {
            return res.status(403).json({ error: "Vous n'avez pas accès à ce projet." });
        }

        const query = `
            INSERT INTO daily_reports (project_id, author_id, content, tasks)
            VALUES ($1, $2, $3, $4)
            RETURNING *`;

        // JSON.stringify(undefined) renvoie la valeur JS `undefined` (pas une
        // chaîne) — et node-postgres rejette toute valeur undefined dans les
        // paramètres. On sécurise avec des valeurs par défaut explicites.
        const values = [
            project_id,
            author_id,
            content ?? '',
            JSON.stringify(tasks ?? []),
        ];
        const result = await pool.query(query, values);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create daily report error:', err);
        res.status(500).json({ error: "Erreur lors de l'enregistrement du rapport" });
    }
};

// 3. Lister les rapports d'un projet — filtré par visibilité également,
// pour ne pas exposer les rapports d'un projet auquel l'utilisateur n'a pas accès.
exports.getReportsByProject = async (req, res) => {
    const { projectId } = req.params;
    try {
        const { seesAll, userId } = await getProjectVisibility(req.user.id);
        const scope = projectVisibilityClause(2, 3);

        const query = `
            SELECT
                r.id,
                r.report_date,
                u.name as author_name,
                jsonb_array_length(COALESCE(r.tasks, '[]'::jsonb)) as tasks_count
            FROM daily_reports r
            JOIN users u ON r.author_id = u.id
            JOIN projects p ON p.id = r.project_id
            WHERE r.project_id = $1 AND ${scope}
            ORDER BY r.report_date DESC;
        `;
        const result = await pool.query(query, [projectId, seesAll, userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Get reports by project error:', err);
        res.status(500).json({ error: "Database error" });
    }
};