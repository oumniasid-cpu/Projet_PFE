const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

// Dashboard metrics
router.get('/stats', authenticateToken, dashboardController.getDashboardStats);

// Budget chart
router.get('/budget-history', authenticateToken, dashboardController.getBudgetHistory);

// Recent projects
router.get('/projects', authenticateToken, dashboardController.getProjects);

// Gantt chart tasks
router.get('/gantt/:projectId', authenticateToken, dashboardController.getGanttData);

module.exports = router;