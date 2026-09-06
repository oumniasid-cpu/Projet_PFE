const pool = require('../db');
const { getProjectVisibility, projectVisibilityClause } = require('../utils/projectVisibility');

// Modèle Gemini utilisé pour la génération de rapport. "gemini-flash-latest"
// est un alias maintenu par Google qui pointe toujours vers le Flash le plus
// récent — évite de casser le code à chaque dépréciation de modèle daté.
// Flash est gratuit en continu sur le niveau gratuit de l'API Gemini (à
// l'inverse de Pro), ce qui convient très bien à ce volume d'usage (PFE).
const GEMINI_MODEL = 'gemini-flash-latest';

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


// 4. Générer un rapport rédigé à partir de notes brutes, via l'API Gemini
// (niveau gratuit, sans carte bancaire — cf. GEMINI_API_KEY ci-dessous).
// Le texte généré est renvoyé au frontend pour relecture/modification —
// rien n'est enregistré ici, l'utilisateur reste maître de l'envoi final
// via POST /api/reports/add.
exports.generateReportAI = async (req, res) => {
    const { project_id, notes } = req.body;

    if (!project_id) {
        return res.status(400).json({ error: "Vous devez sélectionner un projet." });
    }
    if (!notes || !notes.trim()) {
        return res.status(400).json({ error: "Ajoutez quelques notes avant de générer le rapport." });
    }
    if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY manquante dans les variables d\'environnement.');
        return res.status(500).json({ error: "Génération IA indisponible : clé API non configurée côté serveur." });
    }

    try {
        // Même vérification de visibilité que createDailyReport : on ne
        // génère un rapport que pour un projet auquel l'utilisateur a accès.
        const { seesAll, userId } = await getProjectVisibility(req.user.id);
        const scope = projectVisibilityClause(2, 3);
        const project = await pool.query(
            `SELECT p.id, p.name FROM projects p WHERE p.id = $1 AND ${scope}`,
            [project_id, seesAll, userId]
        );
        if (project.rows.length === 0) {
            return res.status(403).json({ error: "Vous n'avez pas accès à ce projet." });
        }

        const prompt = `Tu rédiges un rapport journalier de chantier professionnel en français, pour le projet de construction "${project.rows[0].name}".

Voici les notes brutes prises sur le terrain par le superviseur :
"""
${notes.trim()}
"""

Rédige un paragraphe de rapport clair, factuel et professionnel qui reprend uniquement les informations présentes dans ces notes (n'invente aucun chiffre, aucune tâche, aucun nom qui n'y figure pas). Structure-le en phrases complètes, ton neutre de compte-rendu de chantier. Ne mets pas de titre, ne mets pas de guillemets, renvoie uniquement le texte du rapport.`;

        const aiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': process.env.GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        if (!aiRes.ok) {
            const errBody = await aiRes.text();
            console.error('Gemini API error:', aiRes.status, errBody);
            // 429 = quota gratuit temporairement dépassé (quelques requêtes/minute) —
            // message distinct pour que ça ne soit pas confondu avec une vraie panne.
            if (aiRes.status === 429) {
                return res.status(429).json({ error: "Trop de générations en peu de temps (limite du niveau gratuit). Réessayez dans une minute." });
            }
            return res.status(502).json({ error: "Le service de génération IA a échoué. Réessayez." });
        }

        const aiData = await aiRes.json();
        const generatedText = (aiData.candidates?.[0]?.content?.parts || [])
            .map((part) => part.text || '')
            .join('\n')
            .trim();

        if (!generatedText) {
            return res.status(502).json({ error: "La génération IA n'a renvoyé aucun texte." });
        }

        res.json({ report: generatedText });
    } catch (err) {
        console.error('AI report generation error:', err);
        res.status(500).json({ error: "Erreur serveur lors de la génération du rapport." });
    }
};


// 5. Récupérer un rapport complet (contenu + tâches concernées) — utilisé
// par la modal de détail dans ProjectDetails.jsx.
exports.getReportById = async (req, res) => {
    const { id } = req.params;
    try {
        const { seesAll, userId } = await getProjectVisibility(req.user.id);
        const scope = projectVisibilityClause(2, 3);

        const query = `
            SELECT
                r.id,
                r.report_date,
                r.content,
                r.tasks,
                r.project_id,
                u.name as author_name
            FROM daily_reports r
            JOIN users u ON r.author_id = u.id
            JOIN projects p ON p.id = r.project_id
            WHERE r.id = $1 AND ${scope}
        `;
        const result = await pool.query(query, [id, seesAll, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Rapport introuvable." });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get report by id error:', err);
        res.status(500).json({ error: "Database error" });
    }
};