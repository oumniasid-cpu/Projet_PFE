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
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',  // ← Ajouté name
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

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userQuery.rows[0];
    
    if (!user) return res.status(400).json({ message: 'Email incorrect' });

    // Compare the password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });

    // Create JWT token avec id ET email
    const token = jwt.sign(
      { id: user.id, email: user.email },  // ← Bien id et email
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
        name: user.name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};