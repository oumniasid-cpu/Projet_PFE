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

// Active alerts
router.get('/alerts', authenticateToken, dashboardController.getDashboardAlerts);

// Mark an alert as read
router.patch('/alerts/:alertId/read', authenticateToken, dashboardController.markDashboardAlertRead);

// Gantt chart tasks
router.get('/gantt/:projectId', authenticateToken, dashboardController.getGanttData);

module.exports = router;