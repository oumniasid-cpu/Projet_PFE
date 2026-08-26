const express = require('express');
const router = express.Router();
const reportCtrl = require('../controllers/reportsController');
const auth = require('../middleware/authMiddleware'); // Votre protection JWT

// GET /api/reports/list-projects — liste des projets pour le <select> du frontend
router.get('/list-projects', auth, reportCtrl.getProjectsForDropdown);

// POST /api/reports/add — créer un rapport journalier
router.post('/add', auth, reportCtrl.createDailyReport);

// GET /api/reports/project/:projectId — rapports d'un projet
// (manquait : c'est cette route que ProjectDetails.jsx appelle réellement
// pour l'onglet "Daily reports", d'où le 404 observé jusqu'ici)
router.get('/project/:projectId', auth, reportCtrl.getReportsByProject);

module.exports = router;