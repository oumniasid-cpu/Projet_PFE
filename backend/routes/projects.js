const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const jwt = require('jsonwebtoken');

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// --- ROUTES ---

// Récupérer tous les projets (Protégé car le front envoie un token)
router.get('/', authenticateToken, projectController.getAllProjects);

// Récupérer un projet spécifique par ID
router.get('/:id', authenticateToken, projectController.getProjectById);

// Créer un nouveau projet
router.post('/', authenticateToken, async (req, res) => {
  // Note : Il est recommandé de déplacer cette logique dans projectController.createProject
  try {
    const { name, description, budget_total, start_date, end_date, status } = req.body;
    const pool = require('../db'); // Assurez-vous d'importer votre pool si vous restez ici
    
    const result = await pool.query(
      `INSERT INTO projects (name, description, budget_total, start_date, end_date, status, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, budget_total, start_date, end_date, status || 'planning', req.user.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;