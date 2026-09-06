const express = require('express');
const router = express.Router();
const reportCtrl = require('../controllers/reportsController');
const auth = require('../middleware/authMiddleware'); // Votre protection JWT

// GET /api/reports/list-projects — liste des projets pour le <select> du frontend
router.get('/list-projects', auth, reportCtrl.getProjectsForDropdown);

// POST /api/reports/add — créer un rapport journalier
router.post('/add', auth, reportCtrl.createDailyReport);

// POST /api/reports/generate-ai — génère un texte de rapport rédigé à
// partir de notes brutes, via l'API Claude. Ne sauvegarde rien : le texte
// est renvoyé pour relecture, l'envoi réel reste un appel séparé à /add.
router.post('/generate-ai', auth, reportCtrl.generateReportAI);

// GET /api/reports/project/:projectId — rapports d'un projet
// (manquait : c'est cette route que ProjectDetails.jsx appelle réellement
// pour l'onglet "Daily reports", d'où le 404 observé jusqu'ici)
router.get('/project/:projectId', auth, reportCtrl.getReportsByProject);



const { envoyerRapportParEmail } = require('../services/emailService');

router.post('/envoyer-rapport', async (req, res) => {
  const { emailChefProjet, rapportTexte, nomProjet } = req.body;

  try {
    await envoyerRapportParEmail(emailChefProjet, rapportTexte, nomProjet);
    res.json({ success: true, message: 'Rapport envoyé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur lors de l'envoi" });
  }
});


// GET /api/reports/:id — contenu complet d'un rapport (pour la modal détail)
router.get('/:id', auth, reportCtrl.getReportById);


module.exports = router;