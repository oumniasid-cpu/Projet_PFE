const express = require('express');
const router = express.Router();
const multer = require('multer');
const projectController = require('../controllers/projectController');
const authenticateToken = require('../middleware/authMiddleware');

// Configuration de stockage temporaire pour le fichier .mpp
const upload = multer({ dest: 'uploads/' });

// Route pour importer un fichier MPP
router.post('/import-mpp', upload.single('mppFile'), projectController.importMPP);

// Routes des projets
router.get('/', authenticateToken, projectController.getAllProjects);
router.get('/:id', authenticateToken, projectController.getProjectById);

// Route pour les statistiques de répartition des tâches (analytique)
router.get('/:id/analytics/task-status', authenticateToken, projectController.getTaskStatusDistribution);

// Courbe de progression réelle vs planifiée — alimente le graphique Line
// de AnalyticsTab (ProjectDetails.jsx). Remplace le fallback statique du
// frontend, qui n'était utilisé que parce que cette route répondait 404.
router.get('/:id/analytics/progress-over-time', authenticateToken, projectController.getProgressOverTime);

// Budget estimé vs réel par tâche — alimente le graphique Bar de
// AnalyticsTab (ProjectDetails.jsx). Idem, remplace le fallback statique.
router.get('/:id/analytics/budget-breakdown', authenticateToken, projectController.getBudgetBreakdown);

// Analytics consolidé (budget par tâche, courbe progression, taux de
// respect des délais, nombre de rapports) — un seul appel pour tout l'onglet.
router.get('/:id/analytics', authenticateToken, projectController.getProjectAnalytics);

// Alertes EVM réelles pour ce projet (remplace la fausse alerte statique)
router.get('/:id/alerts', authenticateToken, projectController.getProjectAlerts);

// Route pour créer un projet
router.post('/', authenticateToken, projectController.createProject);

module.exports = router;