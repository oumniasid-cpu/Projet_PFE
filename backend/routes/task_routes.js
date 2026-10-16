const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();
const MAX_TASK_IMAGES = 10;

const taskImageDir = path.join(__dirname, '../uploads/tasks');
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(taskImageDir, { recursive: true });
      cb(null, taskImageDir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_TASK_IMAGES },
  fileFilter: (req, file, cb) => {
    const valid = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) && /\.(jpe?g|png|webp)$/i.test(file.originalname);
    cb(valid ? null : new Error('Format invalide. Utilisez JPG, JPEG, PNG ou WEBP.'), valid);
  },
});
const uploadTaskImages = (req, res, next) => imageUpload.array('pictures', MAX_TASK_IMAGES)(req, res, async (error) => {
  const files = req.files || [];
  const cleanup = () => Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
  if (error) {
    await cleanup();
    const tooManyFiles = error instanceof multer.MulterError && ['LIMIT_UNEXPECTED_FILE', 'LIMIT_FILE_COUNT'].includes(error.code);
    const tooLarge = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge || tooManyFiles ? 413 : 400).json({
      success: false,
      error: tooLarge ? 'Chaque image doit faire au maximum 5 Mo.' : tooManyFiles ? 'Vous pouvez joindre au maximum 10 images.' : error.message,
    });
  }
  for (const file of files) {
    try {
      const bytes = await fs.promises.readFile(file.path);
      const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const isWebp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      if (!isPng && !isJpeg && !isWebp) {
        await cleanup();
        return res.status(400).json({ success: false, error: 'Un fichier sélectionné n’est pas une image valide.' });
      }
    } catch (readError) {
      await cleanup();
      return next(readError);
    }
  }
  next();
});

// Normalise un rôle pour la comparaison : minuscules, sans accents,
// apostrophes unifiées (' vs ’), espaces superflus retirés.
// Ça évite les faux 403 causés par "Ingénieur Suivi" vs "ingenieur_suivi"
// ou "maître d'ouvrage" (apostrophe courbe) vs "maitre d'ouvrage" (droite).
const normalizeRole = (role) =>
  String(role || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retire les accents (é → e, î → i...)
    .replace(/[\u2018\u2019\u0060]/g, "'") // unifie les apostrophes (’ ‘ ` → ')
    .replace(/[_-]/g, ' ')           // unifie underscores/tirets en espace
    .replace(/\s+/g, ' ')
    .trim();

// Rôles habilités à MODIFIER une tâche (avancement, coût réel, rapports,
// dates réelles) — reprend exactement la liste du cahier des charges :
// Chef chantier / conducteur de travaux, Ingénieur suivi, Architecte,
// Maître d'ouvrage.
const MANAGE_TASK_ROLES = new Set([
  'admin',
  'user',
  "maitre d'ouvrage",
  'maitre ouvrage',
  'entrepreneur',
  'chef chantier',
  'conducteur de travaux',
  'ingenieur suivi',
  'ingenieur',
  'architecte',
  'superviseur',
  'supervisor',
].map(normalizeRole));

// Rôles habilités à SUPPRIMER une tâche — plus restrictif, réservé aux
// rôles de décision (maître d'ouvrage / admin).
const DELETE_TASK_ROLES = new Set([
  'admin',
  "maitre d'ouvrage",
  'maitre ouvrage',
  'entrepreneur',
].map(normalizeRole));

const roleGuard = (allowedRoles) => async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    const role = normalizeRole(rows[0]?.role);
    if (!allowedRoles.has(role)) {
      return res.status(403).json({ success: false, error: `Accès non autorisé pour le rôle "${rows[0]?.role || 'inconnu'}".` });
    }
    next();
  } catch (error) {
    next(error);
  }
};

const canManageTasks = roleGuard(MANAGE_TASK_ROLES);
const canDeleteTasks = roleGuard(DELETE_TASK_ROLES);

// tasks.status accepte 2 conventions en parallèle côté base (contrainte CHECK) :
// todo/in-progress/completed (ancien import) ET not_started/in_progress/done/delayed.
// is_delayed et tasks_done doivent traiter 'completed' comme équivalent à 'done',
// sinon une tâche importée avec l'ancien format serait classée "en retard" à tort
// même si elle est en réalité terminée.
const DONE_STATUSES = "('done', 'completed')";

// Liste de colonnes réutilisable pour les requêtes sur "tasks" (SANS FROM).
// NOTE: t.dependencies (colonne brute) n'est PAS incluse ici — la route
// GET /projects/:project_id/tasks recalcule "dependencies" via json_agg,
// donc l'inclure ici créerait une colonne dupliquée dans le résultat.
const taskSelectColumns = `
    t.id, t.project_id, t.parent_task_id, t.wbs_code, COALESCE(t.name, t.title) AS name,
    t.planned_start, t.planned_end, t.actual_start, t.actual_end,
    t.duration_days, t.progress_percent, t.planned_cost, t.actual_cost,
    t.responsible_user_id, u.name AS responsible_name, t.status, t.notes,
    t.color, t.picture,
    COALESCE((
      SELECT json_agg(image_url ORDER BY created_at, image_id)
      FROM (
        SELECT t.picture AS image_url, t.created_at, 0 AS image_id WHERE t.picture IS NOT NULL
        UNION ALL
        SELECT ti.image_url, ti.created_at, ti.id AS image_id FROM task_images ti WHERE ti.task_id = t.id
      ) task_picture_rows
    ), '[]'::json) AS pictures,
    (
      (t.actual_end IS NOT NULL AND t.planned_end IS NOT NULL AND t.actual_end > t.planned_end)
      OR (t.status NOT IN ${DONE_STATUSES} AND t.planned_end IS NOT NULL AND t.planned_end < CURRENT_DATE)
    ) AS is_delayed
`;

// Version complète (colonnes + FROM) pour les usages qui n'ont pas besoin
// de rajouter d'autres colonnes après.
const taskSelect = `SELECT ${taskSelectColumns} FROM tasks t LEFT JOIN users u ON u.id = t.responsible_user_id`;

const ALLOWED_STATUSES = ['not_started', 'in_progress', 'done', 'delayed'];

const computeDuration = (start, end, duration) => {
  if (duration !== undefined && duration !== null && duration !== '') return Number(duration);
  if (!start || !end) return 0;
  const diff = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
  return Number.isFinite(diff) ? Math.max(diff, 0) : 0;
};

// Recalcule le coût réel/dépensé du projet à partir des tâches marquées
// "done" : on somme leur planned_cost (le budget "gagné"/dépensé par les
// tâches terminées), pas actual_cost (champ non renseigné dans le workflow
// actuel de checkbox).
const updateProjectActualCost = async (client, projectId) => {
  await client.query(
    `UPDATE projects
     SET actual_cost = COALESCE(costs.total, 0),
         budget_spent = COALESCE(costs.total, 0)
     FROM (
       SELECT COALESCE(SUM(planned_cost), 0) AS total
       FROM tasks
       WHERE project_id = $1 AND status = 'done'
     ) costs
     WHERE projects.id = $1`,
    [projectId]
  );
};

// ─── GET tasks for a project (with dependencies) ──────────
router.get('/projects/:project_id/tasks', authenticateToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${taskSelectColumns},
       COALESCE(
         (SELECT json_agg(d.depends_on_task_id)
          FROM task_dependencies d
          WHERE d.task_id = t.id),
         '[]'::json
       ) AS dependencies
       FROM tasks t
       LEFT JOIN users u ON u.id = t.responsible_user_id
       WHERE t.project_id = $1
       ORDER BY COALESCE(t.wbs_code, t.id::text) ASC, t.planned_start ASC NULLS LAST`,
      [req.params.project_id]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// ─── GET project summary (EVM, progress, etc.) ──────────
router.get('/projects/:project_id/summary', authenticateToken, async (req, res, next) => {
  try {
    const project = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.project_id]);
    if (!project.rows.length) return res.status(404).json({ error: 'Projet non trouvé' });

    const { rows } = await pool.query(
      `WITH task_data AS (
        SELECT *,
          (
            (actual_end IS NOT NULL AND planned_end IS NOT NULL AND actual_end > planned_end)
            OR (status NOT IN ${DONE_STATUSES} AND planned_end IS NOT NULL AND planned_end < CURRENT_DATE)
          ) AS is_delayed
        FROM tasks
        WHERE project_id = $1
      )
      SELECT
        COALESCE(
          SUM(COALESCE(progress_percent, 0) * GREATEST(COALESCE(duration_days, 1), 1))
          / NULLIF(SUM(GREATEST(COALESCE(duration_days, 1), 1)), 0),
          0
        ) AS overall_progress,
        COALESCE(SUM(planned_cost), 0) AS total_planned_cost,
        COALESCE(SUM(actual_cost), 0) AS total_actual_cost,
        COALESCE(SUM(planned_cost) FILTER (WHERE status = 'done'), 0) AS cost_of_done_tasks,
        COUNT(*)::int AS tasks_total,
        COUNT(*) FILTER (WHERE status IN ${DONE_STATUSES})::int AS tasks_done,
        COUNT(*) FILTER (WHERE is_delayed)::int AS tasks_delayed,
        COUNT(*) FILTER (WHERE status IN ('in_progress', 'in-progress'))::int AS tasks_in_progress
      FROM task_data`,
      [req.params.project_id]
    );

    const p = project.rows[0];
    const summary = rows[0];
    const plannedBudget = Number(p.planned_budget || p.budget_total || summary.total_planned_cost || 0);
    const actualCost = Number(summary.total_actual_cost || p.actual_cost || p.budget_spent || 0);
    const start = p.start_date ? new Date(p.start_date) : null;
    const end = p.end_date ? new Date(p.end_date) : null;
    const today = new Date();
    const totalTimeline = start && end ? Math.max((end - start) / 86400000, 1) : 1;
    const elapsed = start ? Math.max(Math.min((today - start) / 86400000, totalTimeline), 0) : 0;
    const plannedProgressToday = (elapsed / totalTimeline) * 100 || 1;
    const overallProgress = Number(summary.overall_progress || 0);
    const totalPlannedCost = Number(summary.total_planned_cost || 0);
    const costOfDoneTasks = Number(summary.cost_of_done_tasks || 0);

    res.json({
      overall_progress: overallProgress,
      budget_used_pct: plannedBudget > 0 ? (actualCost / plannedBudget) * 100 : 0,
      cost_progress_pct: plannedBudget > 0 ? (costOfDoneTasks / plannedBudget) * 100 : 0,
      cost_of_done_tasks: costOfDoneTasks,
      total_planned_cost: totalPlannedCost,
      total_actual_cost: actualCost,
      tasks_total: summary.tasks_total,
      tasks_done: summary.tasks_done,
      tasks_delayed: summary.tasks_delayed,
      tasks_in_progress: summary.tasks_in_progress,
      days_remaining: end ? Math.ceil((end - today) / 86400000) : 0,
      evm_spi: overallProgress / plannedProgressToday,
      evm_cpi: actualCost > 0 ? totalPlannedCost / actualCost : 0,
    });
  } catch (error) {
    next(error);
  }
});

// ─── CREATE task ──────────────────────────────────────────
router.post('/projects/:project_id/tasks', authenticateToken, canManageTasks, uploadTaskImages, async (req, res, next) => {
  try {
    const task = req.body;
    if (!task.name || !task.planned_start || !task.planned_end) {
      await Promise.all((req.files || []).map((file) => fs.promises.unlink(file.path).catch(() => {})));
      return res.status(400).json({ success: false, error: 'name, planned_start et planned_end sont requis.' });
    }
    const duration = computeDuration(task.planned_start, task.planned_end, task.duration_days);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
      `INSERT INTO tasks (
        project_id, name, title, wbs_code, parent_task_id, planned_start, planned_end, actual_start, actual_end,
        duration_days, planned_cost, responsible_user_id, notes, dependencies, color,
        progress_percent, actual_cost, status, picture
      )
      VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14, '#378ADD'), $15, $16, $17, $18)
      RETURNING *`, [
        req.params.project_id,
        task.name,
        task.wbs_code || null,
        task.parent_task_id || null,
        task.planned_start,
        task.planned_end,
        task.actual_start || null,
        task.actual_end || null,
        duration,
        task.planned_cost || 0,
        task.responsible_user_id || null,
        task.notes || null,
        task.dependencies || null,
        task.color || null,
        task.progress_percent ?? 0,
        task.actual_cost || 0,
        task.status || 'not_started',
        null,
      ]);
      const imageUrls = [];
      for (const file of req.files || []) {
        const imageUrl = `/uploads/tasks/${file.filename}`;
        await client.query('INSERT INTO task_images (task_id, image_url) VALUES ($1, $2)', [rows[0].id, imageUrl]);
        imageUrls.push(imageUrl);
      }
      await client.query('COMMIT');
      res.status(201).json({ success: true, task: { ...rows[0], pictures: imageUrls } });
    } catch (error) {
      await client.query('ROLLBACK');
      await Promise.all((req.files || []).map((file) => fs.promises.unlink(file.path).catch(() => {})));
      next(error);
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// ─── UPDATE task ──────────────────────────────────────────
router.patch('/tasks/:task_id', authenticateToken, canManageTasks, uploadTaskImages, async (req, res, next) => {
  const allowed = [
    'progress_percent', 'planned_cost', 'actual_cost', 'actual_start', 'actual_end', 'status', 'notes',
    'planned_start', 'planned_end', 'duration_days', 'responsible_user_id', 'dependencies',
    'name', 'wbs_code', 'parent_task_id', 'color',
  ];
  const entries = Object.entries(req.body).filter(([key]) => allowed.includes(key));
  const requestedRemovals = req.body.remove_picture_urls || [];
  const removedPictureUrls = Array.isArray(requestedRemovals) ? requestedRemovals : [requestedRemovals];
  if (req.body.remove_picture === 'true') entries.push(['picture', null]);
  if (!entries.length && !removedPictureUrls.length && !(req.files || []).length) return res.status(400).json({ success: false, error: 'Aucun champ valide à mettre à jour.' });

  if (req.body.status !== undefined && !ALLOWED_STATUSES.includes(req.body.status)) {
    return res.status(400).json({ success: false, error: 'Statut invalide.' });
  }

  // Garde le progress_percent synchronisé avec le statut : une tâche
  // "done" doit valoir 100% (sinon elle ne compte pour rien dans
  // l'avancement global calculé par duration_days), et une tâche qui
  // repasse à "not_started"/"in_progress" sans progress_percent fourni
  // explicitement retombe à 0%.
  if (req.body.status === 'done' && req.body.progress_percent === undefined) {
    req.body.progress_percent = 100;
    entries.push(['progress_percent', 100]);
  } else if (
    req.body.status !== undefined &&
    req.body.status !== 'done' &&
    req.body.progress_percent === undefined
  ) {
    req.body.progress_percent = 0;
    entries.push(['progress_percent', 0]);
  }

  if (
    req.body.parent_task_id !== undefined &&
    req.body.parent_task_id !== null &&
    String(req.body.parent_task_id) === String(req.params.task_id)
  ) {
    return res.status(400).json({ success: false, error: 'Une tâche ne peut pas être son propre parent.' });
  }

  const client = await pool.connect();
  const uploadedFiles = req.files || [];
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT * FROM tasks WHERE id = $1', [req.params.task_id]);
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Tâche introuvable.' });
    }
    if (req.body.remove_picture === 'true' && current.rows[0].picture && !removedPictureUrls.includes(current.rows[0].picture)) {
      removedPictureUrls.push(current.rows[0].picture);
    }
    if (current.rows[0].picture && removedPictureUrls.includes(current.rows[0].picture)) entries.push(['picture', null]);
    const existingPictures = await client.query(
      `SELECT image_url FROM (
         SELECT picture AS image_url FROM tasks WHERE id = $1 AND picture IS NOT NULL
         UNION ALL
         SELECT image_url FROM task_images WHERE task_id = $1
       ) task_picture_rows`,
      [req.params.task_id]
    );
    const retainedCount = existingPictures.rows.filter(({ image_url }) => !removedPictureUrls.includes(image_url)).length;
    if (retainedCount + uploadedFiles.length > MAX_TASK_IMAGES) {
      await client.query('ROLLBACK');
      await Promise.all(uploadedFiles.map((file) => fs.promises.unlink(file.path).catch(() => {})));
      return res.status(400).json({ success: false, error: `Une tâche peut contenir au maximum ${MAX_TASK_IMAGES} images.` });
    }

    const merged = { ...current.rows[0], ...req.body };
    if ((req.body.planned_start || req.body.planned_end) && req.body.duration_days === undefined) {
      req.body.duration_days = computeDuration(merged.planned_start, merged.planned_end);
      entries.push(['duration_days', req.body.duration_days]);
    }
    if (req.body.name !== undefined) entries.push(['title', req.body.name]);

    const uniqueEntries = entries.filter(([key], index, arr) => arr.findIndex(([k]) => k === key) === index);
    const sets = uniqueEntries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
    const values = uniqueEntries.map(([, value]) => value === '' ? null : value);
    const updated = uniqueEntries.length
      ? await client.query(
        `UPDATE tasks SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length + 1} RETURNING *`,
        [...values, req.params.task_id]
      )
      : { rows: [current.rows[0]] };
    const removedRows = removedPictureUrls.length
      ? await client.query('DELETE FROM task_images WHERE task_id = $1 AND image_url = ANY($2::text[]) RETURNING image_url', [req.params.task_id, removedPictureUrls])
      : { rows: [] };
    for (const file of uploadedFiles) {
      await client.query('INSERT INTO task_images (task_id, image_url) VALUES ($1, $2)', [req.params.task_id, `/uploads/tasks/${file.filename}`]);
    }
    await updateProjectActualCost(client, updated.rows[0].project_id);
    await client.query('COMMIT');
    await Promise.all(removedRows.rows.map(({ image_url }) => fs.promises.unlink(path.join(__dirname, '..', image_url.replace(/^\//, ''))).catch(() => {})));
    const { rows: pictures } = await pool.query(
      `SELECT image_url FROM (
         SELECT picture AS image_url, created_at, 0 AS image_id FROM tasks WHERE id = $1 AND picture IS NOT NULL
         UNION ALL
         SELECT image_url, created_at, id AS image_id FROM task_images WHERE task_id = $1
       ) task_picture_rows ORDER BY created_at, image_id`,
      [req.params.task_id]
    );
    res.json({ success: true, task: { ...updated.rows[0], pictures: pictures.map((row) => row.image_url) } });
  } catch (error) {
    await client.query('ROLLBACK');
    await Promise.all(uploadedFiles.map((file) => fs.promises.unlink(file.path).catch(() => {})));
    next(error);
  } finally {
    client.release();
  }
});

// ─── DELETE task (cascade children) ──────────────────────
router.delete('/tasks/:task_id', authenticateToken, canDeleteTasks, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const project = await client.query('SELECT project_id FROM tasks WHERE id = $1', [req.params.task_id]);
    if (!project.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Tâche introuvable.' });
    }
    const deleted = await client.query(
      `WITH RECURSIVE tree AS (
        SELECT id FROM tasks WHERE id = $1
        UNION ALL
        SELECT t.id FROM tasks t INNER JOIN tree ON t.parent_task_id = tree.id
      )
      DELETE FROM tasks WHERE id IN (SELECT id FROM tree) RETURNING id`,
      [req.params.task_id]
    );
    await updateProjectActualCost(client, project.rows[0].project_id);
    await client.query('COMMIT');
    res.json({ success: true, deleted_count: deleted.rowCount });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});





module.exports = router;
