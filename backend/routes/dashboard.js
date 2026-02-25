// ============================================================
//  backend/routes/dashboard.js
//  ✅ GARDÉ : votre route /stats existante
//  ➕ AJOUTÉ : 3 nouvelles routes
// ============================================================

const express = require('express');
const router  = express.Router();

const authenticateToken   = require('../middleware/authMiddleware'); // ✅ votre fichier
const dashboardController = require('../controllers/dashboardController');

// ✅ Votre route existante — ne change pas
router.get('/stats',          authenticateToken, dashboardController.getDashboardStats);

// ➕ Nouvelles routes à ajouter
router.get('/budget-history', authenticateToken, dashboardController.getBudgetHistory);
router.get('/projects',       authenticateToken, dashboardController.getProjects);
router.get('/gantt',          authenticateToken, dashboardController.getGantt);

module.exports = router;