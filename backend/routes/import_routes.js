const express = require('express');
const multer = require('multer');
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');
const {
  parse_excel,
  parse_msproject_xml,
  save_project_from_import,
  deleteTempFile,
} = require('../services/import_service');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const logFailedImport = async (req, fileType, error) => {
  try {
    await pool.query(
      `INSERT INTO import_logs (
        imported_by, file_name, file_type, rows_imported, status, error_log
      )
      VALUES ($1, $2, $3, 0, 'failed', $4)`,
      [req.user?.id || null, req.file?.originalname || null, fileType || null, error.message]
    );
  } catch (logError) {
    console.error('Import log failed:', logError);
  }
};

router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  let fileType = null;
  try {
    const projectName = String(req.body.project_name || '').trim();
    const ownerId = Number(req.body.owner_id || req.user.id);
    if (!projectName) {
      throw new Error('Nom du projet requis.');
    }
    if (!req.file) {
      throw new Error('Fichier requis.');
    }

    const ext = req.file.originalname.toLowerCase().split('.').pop();
    let tasks;
    if (ext === 'xlsx') {
      fileType = 'excel';
      tasks = parse_excel(req.file);
    } else if (ext === 'xml') {
      fileType = 'xml';
      tasks = parse_msproject_xml(req.file);
    } else {
      throw new Error('Type de fichier invalide. Formats acceptes : .xlsx, .xml.');
    }

    const projectId = await save_project_from_import(
      projectName,
      tasks,
      ownerId,
      req.file.originalname,
      fileType,
      fileType === 'excel' ? 'excel' : 'msproject'
    );

    res.json({ success: true, project_id: projectId, tasks_count: tasks.length });
  } catch (error) {
    await logFailedImport(req, fileType, error);
    res.status(400).json({ success: false, error: error.message });
  } finally {
    deleteTempFile(req.file);
  }
});

module.exports = router;
