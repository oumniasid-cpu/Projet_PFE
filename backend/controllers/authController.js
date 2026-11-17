const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createHmac, randomInt, timingSafeEqual } = require('crypto');
const { envoyerCodeReinitialisation } = require('../services/emailService');

const RESET_CODE_TTL_MINUTES = 10;
const RESET_CODE_MAX_ATTEMPTS = 5;
const RESET_CODE_RESPONSE = 'Si cette adresse correspond à un compte, un code de confirmation a été envoyé.';

function hashResetCode(userId, code) {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('PASSWORD_RESET_SECRET ou JWT_SECRET doit être configuré.');

  return createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
}

function resetCodeMatches(userId, code, storedHash) {
  const actualHash = Buffer.from(hashResetCode(userId, code), 'hex');
  const expectedHash = Buffer.from(storedHash, 'hex');
  return actualHash.length === expectedHash.length && timingSafeEqual(actualHash, expectedHash);
}

exports.requestPasswordReset = async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) return res.status(400).json({ message: 'Veuillez saisir une adresse e-mail valide.' });

  try {
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE LOWER(email) = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({ message: RESET_CODE_RESPONSE });
    }

    const user = userResult.rows[0];
    const recentRequest = await pool.query(
      `SELECT created_at FROM password_reset_codes
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 minute'`,
      [user.id]
    );

    if (recentRequest.rows.length > 0) {
      return res.json({ message: RESET_CODE_RESPONSE });
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = hashResetCode(user.id, code);

    await pool.query(
      `INSERT INTO password_reset_codes (user_id, code_hash, expires_at, attempts, created_at)
       VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'), 0, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET code_hash = EXCLUDED.code_hash,
           expires_at = EXCLUDED.expires_at,
           attempts = 0,
           created_at = NOW()`,
      [user.id, codeHash, RESET_CODE_TTL_MINUTES]
    );

    try {
      await envoyerCodeReinitialisation(user.email, code);
    } catch (error) {
      await pool.query(
        'DELETE FROM password_reset_codes WHERE user_id = $1 AND code_hash = $2',
        [user.id, codeHash]
      );
      console.error('Échec de l’envoi du code de réinitialisation:', error);
      return res.status(202).json({ message: RESET_CODE_RESPONSE });
    }

    return res.json({ message: RESET_CODE_RESPONSE });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation du mot de passe:', error);
    return res.status(500).json({ message: "Impossible d'envoyer le code pour le moment." });
  }
};

exports.resetPasswordWithCode = async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
  const newPassword = req.body.newPassword;

  if (!email || !/^\d{6}$/.test(code) || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      message: 'Saisissez le code à 6 chiffres et un nouveau mot de passe de 6 caractères minimum.',
    });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 FOR UPDATE',
      [email]
    );
    const user = userResult.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Code invalide ou expiré.' });
    }

    const resetResult = await client.query(
      'SELECT code_hash, expires_at, attempts FROM password_reset_codes WHERE user_id = $1 FOR UPDATE',
      [user.id]
    );
    const resetRequest = resetResult.rows[0];

    if (!resetRequest || new Date(resetRequest.expires_at) <= new Date() || resetRequest.attempts >= RESET_CODE_MAX_ATTEMPTS) {
      await client.query('DELETE FROM password_reset_codes WHERE user_id = $1', [user.id]);
      await client.query('COMMIT');
      return res.status(400).json({ message: 'Code invalide ou expiré.' });
    }

    if (!resetCodeMatches(user.id, code, resetRequest.code_hash)) {
      await client.query(
        'UPDATE password_reset_codes SET attempts = attempts + 1 WHERE user_id = $1',
        [user.id]
      );
      await client.query('COMMIT');
      return res.status(400).json({ message: 'Code invalide ou expiré.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await client.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );
    await client.query('DELETE FROM password_reset_codes WHERE user_id = $1', [user.id]);
    await client.query('COMMIT');

    return res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    return res.status(500).json({ message: 'Impossible de réinitialiser le mot de passe pour le moment.' });
  } finally {
    client?.release();
  }
};

exports.register = async (req, res) => {
  const { email, password, name } = req.body;  // ← Ajouté name

  try {
    // Check if user exists
    const userExist = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Générer un nom par défaut si pas fourni
    const userName = name || email.split('@')[0];  // ← Utilise l'email si pas de nom

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user AVEC name
    const newUser = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, role',  // ← Ajouté role
      [email, hashedPassword, userName]  // ← Ajouté userName
    );

    res.status(201).json({ 
      message: 'User registered successfully', 
      user: newUser.rows[0] 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/auth/profile — met à jour le profil de l'utilisateur connecté.
// Volontairement : n'accepte PAS `role` depuis req.body (un utilisateur ne
// doit pas pouvoir se promouvoir lui-même admin). Le changement de rôle
// devra passer par un futur endpoint réservé aux admins (/api/users/:id/role).
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone } = req.body; // password retiré : voir changePassword()

  try {
    const fields = [];
    const values = [];
    let i = 1;

    if (name !== undefined && name !== '') {
      fields.push(`name = $${i++}`);
      values.push(name);
    }

    if (email !== undefined && email !== '') {
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé par un autre compte.' });
      }
      fields.push(`email = $${i++}`);
      values.push(email);
    }

    // Chaîne vide autorisée (pour pouvoir effacer le numéro) : on ne teste
    // que `undefined`, contrairement à name/email au-dessus.
    if (phone !== undefined) {
      fields.push(`phone = $${i++}`);
      values.push(phone);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour.' });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${i}
      RETURNING id, email, name, role, phone, notification_prefs
    `;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.json({ message: 'Profil mis à jour avec succès.', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


// GET /api/auth/profile — le login ne renvoie que id/email/name/role ;
// Settings.jsx a besoin de phone + notification_prefs en plus.
exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role, phone, notification_prefs FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/auth/password — exige l'ancien mot de passe.
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe requis.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
  }

  try {
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/auth/notifications — fusionne avec le JSONB existant (|| en
// Postgres) pour ne jamais écraser une préférence non envoyée.
exports.updateNotificationPrefs = async (req, res) => {
  const userId = req.user.id;
  const { email_alerts, budget_alerts, weekly_reports } = req.body;

  const patch = {};
  if (email_alerts !== undefined) patch.email_alerts = !!email_alerts;
  if (budget_alerts !== undefined) patch.budget_alerts = !!budget_alerts;
  if (weekly_reports !== undefined) patch.weekly_reports = !!weekly_reports;

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ message: 'Aucune préférence à mettre à jour.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET notification_prefs = notification_prefs || $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING notification_prefs`,
      [JSON.stringify(patch), userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    res.json({ message: 'Préférences mises à jour.', notification_prefs: result.rows[0].notification_prefs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/auth/account — protégé par le mot de passe (pas juste le
// token), et bloqué si l'utilisateur possède encore des projets, pour ne
// pas laisser de projets orphelins.
exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Mot de passe requis pour confirmer la suppression.' });
  }

  try {
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const isMatch = await bcrypt.compare(password, result.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe incorrect.' });
    }

    // ⚠️ Ajuste `owner_id` si la colonne s'appelle autrement dans ta table
    // `projects` (je ne l'ai pas dans les fichiers partagés jusqu'ici).
    const owned = await pool.query('SELECT COUNT(*) FROM projects WHERE owner_id = $1', [userId]);
    if (parseInt(owned.rows[0].count) > 0) {
      return res.status(409).json({
        message: "Impossible de supprimer ce compte : vous êtes encore propriétaire de projets. Transférez-les ou supprimez-les d'abord.",
      });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'Compte supprimé avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userQuery.rows[0];
    
    if (!user) return res.status(400).json({ message: 'Email incorrect' });

    // Compare the password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });

    // Create JWT token avec id, email ET role
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },  // ← Ajouté role
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }  // ← Changé de 1h à 7d (optionnel)
    );

    // Retourner aussi les infos user
    res.json({ 
      message: 'Connexion réussie', 
      token,
      user: {  // ← Ajouté pour le frontend
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role  // ← utilisé par SideBar.jsx pour afficher/masquer "Gestion des utilisateurs"
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};