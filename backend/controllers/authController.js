const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  const { name, email, password } = req.body;

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

    if (password !== undefined && password !== '') {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push(`password = $${i++}`);
      values.push(hashedPassword);
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
      RETURNING id, email, name, role
    `;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.json({
      message: 'Profil mis à jour avec succès.',
      user: result.rows[0],
    });
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