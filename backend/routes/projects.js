const express = require('express');
const router = express.Router();
const multer = require('multer');
const projectController = require('../controllers/projectController');
const jwt = require('jsonwebtoken');
// Ajoutez ceci après la route GET '/'
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

// Configuration de stockage temporaire pour le fichier .mpp
const upload = multer({ dest: 'uploads/' });

// Remplace importMPP par projectController.importMPP
router.post('/import-mpp', upload.single('mppFile'), projectController.importMPP);


// ROUTES
router.get('/', projectController.getAllProjects); // Utilise le controller
router.get('/:id', authenticateToken, projectController.getProjectById);
 // AJOUTÉ : Route pour l'ID spécifique
router.post('/', authenticateToken, async (req, res) => {
  // Votre logique de création ici...
});

module.exports = router;