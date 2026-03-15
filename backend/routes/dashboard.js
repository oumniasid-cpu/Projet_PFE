// ============================================================
//  backend/routes/dashboard.js
// ============================================================

const express = require('express');
const router  = express.Router();

// Importation du middleware et du contrôleur
const authenticateToken   = require('../middleware/authMiddleware'); 
const dashboardController = require('../controllers/dashboardController');

/**
 * @route   GET /api/dashboard/stats
 * @desc    Récupère les KPI (projets actifs, budget total, progression, alertes)
 * @access  Privé
 */
router.get('/stats', authenticateToken, dashboardController.getDashboardStats);

/**
 * @route   GET /api/dashboard/gantt/:projectId
 * @desc    Récupère les données de planification pour le diagramme de Gantt
 * @access  Privé
 */
// Correction du nom de la fonction pour correspondre au contrôleur
router.get('/gantt/:projectId', authenticateToken, dashboardController.getGanttData);

/**
 * @route   GET /api/dashboard/budget-history
 * @desc    Récupère l'historique financier pour le graphique AreaChart
 * @access  Privé
 */
// Note : Si getDashboardStats renvoie déjà le budgetHistory, cette route est optionnelle
router.get('/budget-history', authenticateToken, dashboardController.getBudgetHistory);

module.exports = router;