const express = require('express');
const router = express.Router();
const multer = require('multer');
const projectController = require('../controllers/projectController');

// Même middleware partagé que tasks.js et dashboard.js — c'était la source
// du 403 sur GET /api/projects/:id (le doublon local pouvait diverger du
// middleware partagé et rejeter des tokens pourtant valides).
const authenticateToken = require('../middleware/authMiddleware');

// Configuration de stockage temporaire pour le fichier .mpp
const upload = multer({ dest: 'uploads/' });

router.post('/import-mpp', upload.single('mppFile'), projectController.importMPP);

// ROUTES — toutes protégées
router.get('/', authenticateToken, projectController.getAllProjects);
router.get('/:id', authenticateToken, projectController.getProjectById);
router.post('/', authenticateToken, async (req, res) => {
  // Votre logique de création ici...
});

module.exports = router;