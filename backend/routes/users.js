// ============================================================
// routes/users.js  (Express + pg)
//
// Endpoints utilisés par src/pages/UserManagement.jsx :
//   GET    /api/users       -> liste des utilisateurs
//   POST   /api/users       -> crée un utilisateur (mot de passe temporaire
//                              généré et, si SMTP configuré, envoyé par e-mail)
//   PATCH  /api/users/:id   -> met à jour role et/ou status
//   DELETE /api/users/:id   -> supprime un utilisateur
//
// Toutes les routes sont réservées aux admins.
//
// Hypothèses sur le schéma (à adapter si différent chez vous) :
//   users(id, name, email, role, status, password, created_at)
//   -> si "status" n'existe pas encore, exécutez 002_users_status.sql
// ============================================================
const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Même chargeur tolérant que routes/notifications.js : essaie plusieurs
// emplacements/styles d'export pour fonctionner sans modification.
function load(paths) {
  for (const p of paths) {
    try { return require(p); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
  }
  throw new Error('routes/users.js: module introuvable. Essayé: ' + paths.join(', '));
}
const dbMod = load(['../db', '../config/db', '../config/database', '../database/db', '../db/index', '../models/db']);
const pool = dbMod.pool || dbMod;
const authMod = load(['../middleware/auth', '../middlewares/auth', '../middleware/authMiddleware', '../middlewares/authMiddleware', '../middleware/authenticate']);
const authMw = (typeof authMod === 'function' ? authMod : null)
  || authMod.authenticate || authMod.protect || authMod.verifyToken || authMod.auth || authMod.authMiddleware
  || authMod.authenticateToken || authMod.requireAuth || authMod.isAuthenticated || authMod.verifyJWT
  || Object.entries(authMod).find(([k, v]) => typeof v === 'function' && /auth|protect|verify|token|jwt/i.test(k))?.[1];
if (typeof authMw !== 'function') {
  throw new Error('routes/users.js: middleware JWT introuvable. Exports du module auth: ' + JSON.stringify(Object.keys(authMod)));
}
const authenticate = (req, res, next) => authMw(req, res, next);

const router = express.Router();

const norm = (r) => String(r || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const isAdmin = (r) => norm(r).includes('admin');
const adminOnly = (req, res, next) => (isAdmin(req.user?.role) ? next() : res.status(403).json({ message: 'Réservé aux administrateurs' }));
const VALID_ROLES = ['admin', 'chef_projet', 'ingenieur']; // 'customer' retiré, remplacé par chef_projet

// ── e-mail d'invitation (best effort : si SMTP n'est pas configuré,
//    on renvoie quand même le mot de passe temporaire dans la réponse
//    pour que l'admin puisse le transmettre lui-même) ─────────────
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

async function sendInvite(email, name, tempPassword) {
  if (!transporter) return false;
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Votre accès BuildTrack',
      html: `<p>Bonjour ${name},</p>
             <p>Un compte a été créé pour vous sur BuildTrack.</p>
             <p>Identifiant : <b>${email}</b><br>Mot de passe temporaire : <b>${tempPassword}</b></p>
             <p>Merci de le changer dès votre première connexion.</p>`,
    });
    return true;
  } catch (e) {
    console.error('[sendInvite]', e);
    return false;
  }
}

// GET /api/users
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC NULLS LAST, id DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error('[GET /users]', e);
    res.status(500).json({ message: 'Erreur lors du chargement des utilisateurs.' });
  }
});

// POST /api/users  body: { name, email, role }
router.post('/', authenticate, adminOnly, async (req, res) => {
  const { name, email, role } = req.body || {};
  if (!name || !email || !role) return res.status(400).json({ message: 'name, email et role sont requis.' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ message: `role doit être l'un de : ${VALID_ROLES.join(', ')}` });

  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
    if (exists.rowCount) return res.status(409).json({ message: 'Cet e-mail est déjà utilisé.' });

    const tempPassword = crypto.randomBytes(6).toString('base64url'); // ex: "k3F9pQ2x"
    const hash = await bcrypt.hash(tempPassword, 10);

    const { rows: [user] } = await pool.query(
      `INSERT INTO users (name, email, role, status, password)
       VALUES ($1, $2, $3, 'active', $4)
       RETURNING id, name, email, role, status, created_at`,
      [name, email, role, hash]
    );

    const emailSent = await sendInvite(email, name, tempPassword);
    res.status(201).json({ user, emailSent, tempPassword: emailSent ? undefined : tempPassword });
  } catch (e) {
    console.error('[POST /users]', e);
    res.status(500).json({ message: "Erreur lors de la création de l'utilisateur." });
  }
});

// PATCH /api/users/:id  body: { role?, status? }
router.patch('/:id', authenticate, adminOnly, async (req, res) => {
  const { role, status } = req.body || {};
  if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ message: `role doit être l'un de : ${VALID_ROLES.join(', ')}` });
  if (status && !['active', 'inactive'].includes(status)) return res.status(400).json({ message: "status doit être 'active' ou 'inactive'." });
  if (!role && !status) return res.status(400).json({ message: 'Rien à mettre à jour.' });

  try {
    const { rows: [user] } = await pool.query(
      `UPDATE users SET role = COALESCE($2, role), status = COALESCE($3, status)
       WHERE id = $1 RETURNING id, name, email, role, status, created_at`,
      [req.params.id, role || null, status || null]
    );
    user ? res.json(user) : res.status(404).json({ message: 'Utilisateur introuvable.' });
  } catch (e) {
    console.error('[PATCH /users/:id]', e);
    res.status(500).json({ message: 'Erreur lors de la mise à jour.' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  if (String(req.user.id) === String(req.params.id)) {
    return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }
  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    rowCount ? res.status(204).end() : res.status(404).json({ message: 'Utilisateur introuvable.' });
  } catch (e) {
    console.error('[DELETE /users/:id]', e);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;