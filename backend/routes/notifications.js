// ============================================================
// notifications.js  (Node/Express + pg)
//
// Location: backend/routes/notifications.js
// Finds your db pool and JWT middleware automatically (see load() below).
//
// ENV: JWT_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, APP_URL
// npm i nodemailer jsonwebtoken
// ============================================================
const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Tries several common locations/export styles so the file works from backend/routes/ without edits.
function load(paths) {
  for (const p of paths) {
    try { return require(p); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  }
  throw new Error('notifications.js: module introuvable. Essayé: ' + paths.join(', '));
}
const dbMod = load(['../db', '../config/db', '../config/database', '../database/db', '../db/index', '../models/db']);
const pool = dbMod.pool || dbMod;
const authMod = load(['../middleware/auth', '../middlewares/auth', '../middleware/authMiddleware', '../middlewares/authMiddleware', '../middleware/authenticate']);
// Pick the JWT middleware: default export, a well-known name, or any exported function whose name looks like auth.
const authMw = (typeof authMod === 'function' ? authMod : null)
  || authMod.authenticate || authMod.protect || authMod.verifyToken || authMod.auth || authMod.authMiddleware
  || authMod.authenticateToken || authMod.requireAuth || authMod.isAuthenticated || authMod.verifyJWT
  || Object.entries(authMod).find(([k, v]) => typeof v === 'function' && /auth|protect|verify|token|jwt/i.test(k))?.[1];
if (typeof authMw !== 'function') {
  throw new Error('notifications.js: middleware JWT introuvable. Exports du module auth: ' + JSON.stringify(Object.keys(authMod)));
}

// Normalise the user object whatever field names your JWT uses.
const normUser = (u = {}) => ({
  ...u,
  id: u.id ?? u.userId ?? u.user_id,
  name: u.name || u.nom || u.username || u.full_name || u.email || 'Utilisateur',
  role: u.role || u.role_name || u.user_role || '',
});
const authenticate = (req, res, next) =>
  authMw(req, res, (err) => {
    if (err) return next(err);
    req.user = normUser(req.user);
    next();
  });

const router = express.Router();

// ── helpers ─────────────────────────────────────────────────
const norm = (r) => String(r || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const isAdmin = (r) => norm(r).includes('admin');
const roleKind = (r) => {
  const n = norm(r);
  if (n.includes('ingenieur') || n.includes('engineer')) return 'ingenieur';
  if (n.includes('chef') || n.includes('manager')) return 'chef_projet';
  return null; // admins & others are never tracked
};
const adminOnly = (req, res, next) =>
  isAdmin(req.user?.role) ? next() : res.status(403).json({ error: 'Admin only' });

const PRIORITIES = ['low', 'normal', 'high', 'critical'];
const rank = (p) => PRIORITIES.indexOf(p);
const DEFAULT_PREFS = {
  in_app_enabled: true, email_enabled: false, frequency: 'instant',
  quiet_start: null, quiet_end: null, min_priority: 'low', timezone: 'Africa/Algiers',
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function getPrefs(adminId) {
  const { rows } = await pool.query('SELECT * FROM notification_preferences WHERE admin_id=$1', [adminId]);
  return { ...DEFAULT_PREFS, ...(rows[0] || {}) };
}

function inQuietHours(p, now = new Date()) {
  if (!p.quiet_start || !p.quiet_end) return false;
  const hm = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: p.timezone || 'Africa/Algiers',
  }).format(now);
  const s = String(p.quiet_start).slice(0, 5);
  const e = String(p.quiet_end).slice(0, 5);
  return s <= e ? hm >= s && hm < e : hm >= s || hm < e; // handles 22:00 -> 07:00
}

// ── SSE hub (real-time) ─────────────────────────────────────
const clients = new Map(); // adminId -> Set<res>
const push = (adminId, event, data) => {
  for (const res of clients.get(adminId) || []) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const NOTIF_SELECT = `
  SELECT n.id, n.admin_id, n.read_at, n.archived_at, n.created_at AS notified_at,
         a.id AS activity_id, a.actor_name, a.actor_role, a.project_id, a.project_name,
         a.task_id, a.task_name, a.action, a.summary, a.priority, a.created_at
    FROM notifications n JOIN activity_log a ON a.id = n.activity_id`;

// ── PUBLIC API: call this from your existing routes ─────────
// logActivity({ actor: req.user, projectId, taskId, action, summary, priority })
// Never throws: a notification problem must not break the user's save.
async function logActivity({ actor, projectId = null, taskId = null, action, summary, priority = 'normal', metadata = {} }) {
  try {
    actor = normUser(actor);
    const kind = roleKind(actor.role);
    if (!kind) return null;
    if (!PRIORITIES.includes(priority)) priority = 'normal';

    const { rows: [a] } = await pool.query(
      `INSERT INTO activity_log
         (actor_id, actor_name, actor_role, project_id, project_name, task_id, task_name, action, summary, priority, metadata)
       VALUES ($1, $2, $3, $4::int, (SELECT name FROM projects WHERE id = $4::int),
               $5::int, (SELECT name FROM tasks WHERE id = $5::int), $6, $7, $8, $9)
       RETURNING id`,
      [actor.id, actor.name || 'Utilisateur', kind, projectId, taskId, action, summary, priority, metadata]
    );

    const { rows: created } = await pool.query(
      `INSERT INTO notifications (admin_id, activity_id)
       SELECT id, $1 FROM users WHERE lower(role) LIKE '%admin%' AND id <> $2
       RETURNING id`,
      [a.id, actor.id]
    );
    if (!created.length) return a.id;

    const { rows: items } = await pool.query(`${NOTIF_SELECT} WHERE n.id = ANY($1)`, [created.map((r) => r.id)]);
    for (const n of items) {
      const prefs = await getPrefs(n.admin_id);
      const silent = !prefs.in_app_enabled || inQuietHours(prefs) || rank(n.priority) < rank(prefs.min_priority);
      push(n.admin_id, 'notification', { ...n, silent }); // badge always updates, pop-up only if !silent
      if (prefs.email_enabled && prefs.frequency === 'instant') flushEmails(n.admin_id).catch(console.error);
    }
    return a.id;
  } catch (e) {
    console.error('[logActivity]', e);
    return null;
  }
}

// ── EMAIL (instant / hourly / daily digests, quiet hours respected) ──
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});
const GAP_MS = { instant: 0, hourly: 3600e3, daily: 86400e3 };
const flushing = new Set();

async function flushEmails(onlyAdminId = null) {
  const { rows: admins } = await pool.query(
    `SELECT u.id, u.email, p.frequency, p.quiet_start, p.quiet_end, p.timezone, p.min_priority, p.last_email_at
       FROM notification_preferences p JOIN users u ON u.id = p.admin_id
      WHERE p.email_enabled AND u.email IS NOT NULL ${onlyAdminId ? 'AND u.id = $1' : ''}`,
    onlyAdminId ? [onlyAdminId] : []
  );
  for (const ad of admins) {
    if (flushing.has(ad.id) || inQuietHours(ad)) continue;
    if (ad.last_email_at && Date.now() - new Date(ad.last_email_at) < GAP_MS[ad.frequency]) continue;
    flushing.add(ad.id);
    try {
      const { rows } = await pool.query(
        `${NOTIF_SELECT}
          WHERE n.admin_id = $1 AND n.emailed_at IS NULL AND n.archived_at IS NULL
            AND array_position($2::text[], a.priority) >= $3
          ORDER BY n.id`,
        [ad.id, PRIORITIES, rank(ad.min_priority) + 1]
      );
      if (!rows.length) continue;

      const subject = rows.length === 1
        ? `[Chantier] ${rows[0].actor_name} – ${rows[0].project_name || 'Projet'}`
        : `[Chantier] ${rows.length} nouvelles mises à jour`;
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
        <h2 style="color:#042c53">Mises à jour de chantier</h2>
        ${rows.map((r) => `<div style="border-left:4px solid #1d37c8;padding:6px 12px;margin:10px 0">
          <b>${esc(r.actor_name)}</b> <small>(${r.actor_role === 'ingenieur' ? 'Ingénieur' : 'Chef de projet'})</small>
          – ${new Date(r.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Algiers' })}<br>
          <span style="color:#185fa5">${esc([r.project_name, r.task_name].filter(Boolean).join(' › '))}</span> · priorité ${esc(r.priority)}<br>
          ${esc(r.summary)}</div>`).join('')}
        <p><a href="${esc(process.env.APP_URL || '')}/notifications">Ouvrir le fil de notifications</a></p></div>`;

      await transporter.sendMail({ from: process.env.MAIL_FROM, to: ad.email, subject, html });
      await pool.query('UPDATE notifications SET emailed_at = now() WHERE id = ANY($1)', [rows.map((r) => r.id)]);
      await pool.query('UPDATE notification_preferences SET last_email_at = now() WHERE admin_id = $1', [ad.id]);
    } catch (e) {
      console.error('[flushEmails]', e);
    } finally {
      flushing.delete(ad.id);
    }
  }
}
// Handles hourly/daily digests and mail held back by quiet hours.
// Running several server instances? Guard with pg_try_advisory_lock or use node-cron on one instance.
const startScheduler = () => setInterval(() => flushEmails().catch(console.error), 60_000);

// ── shared filter builder (feed + audit) ────────────────────
function buildFilters(q, params) {
  const w = [];
  const add = (sql, v) => { params.push(v); w.push(sql.replace('?', `$${params.length}`)); };
  if (q.project_id && Number(q.project_id)) add('a.project_id = ?', Number(q.project_id));
  if (['chef_projet', 'ingenieur'].includes(q.role)) add('a.actor_role = ?', q.role);
  if (PRIORITIES.includes(q.priority)) add('a.priority = ?', q.priority);
  if (q.from) add('a.created_at >= ?::date', q.from);
  if (q.to) add('a.created_at < (?::date + 1)', q.to);
  if (q.q && q.q.trim()) {
    params.push(`%${q.q.trim().replace(/[\\%_]/g, '\\$&')}%`);
    const i = params.length;
    w.push(`(a.actor_name ILIKE $${i} OR a.project_name ILIKE $${i} OR a.task_name ILIKE $${i} OR a.summary ILIKE $${i})`);
  }
  return w;
}
const pageSize = (q) => Math.min(Math.max(Number(q.limit) || 20, 1), 100);

// ── ROUTES (mounted at /api/notifications) ──────────────────
// 1) Live stream. EventSource cannot send headers, so the JWT comes in the query string.
router.get('/stream', (req, res) => {
  let user;
  try { user = normUser(jwt.verify(req.query.token, process.env.JWT_SECRET)); } catch { return res.sendStatus(401); }
  if (!isAdmin(user.role)) return res.sendStatus(403);

  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 5000\n\n');
  if (!clients.has(user.id)) clients.set(user.id, new Set());
  clients.get(user.id).add(res);
  const beat = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(beat);
    clients.get(user.id)?.delete(res);
  });
});

router.get('/unread-count', authenticate, adminOnly, async (req, res) => {
  const { rows: [r] } = await pool.query(
    'SELECT count(*)::int AS count FROM notifications WHERE admin_id=$1 AND read_at IS NULL AND archived_at IS NULL',
    [req.user.id]
  );
  res.json(r);
});

router.get('/preferences', authenticate, adminOnly, async (req, res) => {
  res.json(await getPrefs(req.user.id));
});

router.put('/preferences', authenticate, adminOnly, async (req, res) => {
  const b = req.body || {};
  const prev = await getPrefs(req.user.id);
  const p = {
    in_app_enabled: !!b.in_app_enabled,
    email_enabled: !!b.email_enabled,
    frequency: ['instant', 'hourly', 'daily'].includes(b.frequency) ? b.frequency : 'instant',
    quiet_start: /^\d{2}:\d{2}/.test(b.quiet_start || '') ? b.quiet_start.slice(0, 5) : null,
    quiet_end: /^\d{2}:\d{2}/.test(b.quiet_end || '') ? b.quiet_end.slice(0, 5) : null,
    min_priority: PRIORITIES.includes(b.min_priority) ? b.min_priority : 'low',
  };
  if (!p.quiet_start || !p.quiet_end) p.quiet_start = p.quiet_end = null;
  // Turning email on must not mail the whole backlog.
  if (p.email_enabled && !prev.email_enabled) {
    await pool.query('UPDATE notifications SET emailed_at = now() WHERE admin_id=$1 AND emailed_at IS NULL', [req.user.id]);
  }
  const { rows: [saved] } = await pool.query(
    `INSERT INTO notification_preferences
       (admin_id, in_app_enabled, email_enabled, frequency, quiet_start, quiet_end, min_priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (admin_id) DO UPDATE SET
       in_app_enabled=$2, email_enabled=$3, frequency=$4, quiet_start=$5, quiet_end=$6, min_priority=$7
     RETURNING *`,
    [req.user.id, p.in_app_enabled, p.email_enabled, p.frequency, p.quiet_start, p.quiet_end, p.min_priority]
  );
  res.json(saved);
});

router.post('/mark-all-read', authenticate, adminOnly, async (req, res) => {
  const { rowCount } = await pool.query(
    'UPDATE notifications SET read_at = now() WHERE admin_id=$1 AND read_at IS NULL AND archived_at IS NULL',
    [req.user.id]
  );
  res.json({ updated: rowCount });
});

// 2) Audit trail: every logged update, regardless of read/archived/dismissed state.
router.get('/audit', authenticate, adminOnly, async (req, res) => {
  const params = [];
  const w = buildFilters(req.query, params);
  if (Number(req.query.before)) { params.push(Number(req.query.before)); w.push(`a.id < $${params.length}`); }
  params.push(pageSize(req.query));
  const { rows } = await pool.query(
    `SELECT a.id, a.actor_name, a.actor_role, a.project_id, a.project_name, a.task_id, a.task_name,
            a.action, a.summary, a.priority, a.created_at
       FROM activity_log a ${w.length ? 'WHERE ' + w.join(' AND ') : ''}
      ORDER BY a.id DESC LIMIT $${params.length}`,
    params
  );
  res.json({ items: rows });
});

// 3) Feed: status = inbox (default) | unread | archived
router.get('/', authenticate, adminOnly, async (req, res) => {
  const params = [req.user.id];
  const w = ['n.admin_id = $1', ...buildFilters(req.query, params)];
  const s = req.query.status;
  if (s === 'archived') w.push('n.archived_at IS NOT NULL');
  else {
    w.push('n.archived_at IS NULL');
    if (s === 'unread') w.push('n.read_at IS NULL');
  }
  if (Number(req.query.before)) { params.push(Number(req.query.before)); w.push(`n.id < $${params.length}`); }
  params.push(pageSize(req.query));
  const { rows } = await pool.query(
    `${NOTIF_SELECT} WHERE ${w.join(' AND ')} ORDER BY n.id DESC LIMIT $${params.length}`,
    params
  );
  res.json({ items: rows });
});

// 4) Mark read/unread, archive/restore: body { read?: boolean, archived?: boolean }
router.patch('/:id', authenticate, adminOnly, async (req, res) => {
  const read = typeof req.body.read === 'boolean' ? req.body.read : null;
  const archived = typeof req.body.archived === 'boolean' ? req.body.archived : null;
  const { rows: [r] } = await pool.query(
    `UPDATE notifications SET
       read_at = CASE WHEN $3::boolean IS TRUE OR $2::boolean IS TRUE THEN COALESCE(read_at, now())
                      WHEN $2::boolean IS FALSE THEN NULL ELSE read_at END,
       archived_at = CASE WHEN $3::boolean IS TRUE THEN COALESCE(archived_at, now())
                          WHEN $3::boolean IS FALSE THEN NULL ELSE archived_at END
     WHERE id = $1 AND admin_id = $4
     RETURNING id, read_at, archived_at`,
    [req.params.id, read, archived, req.user.id]
  );
  r ? res.json(r) : res.status(404).json({ error: 'Not found' });
});

module.exports = { router, logActivity, startScheduler };