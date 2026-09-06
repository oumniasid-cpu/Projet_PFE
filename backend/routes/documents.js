const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Corrigé : ../middleware/auth (export nommé { authenticate }) et
// ../db (export nommé { pool }) ne correspondent au pattern d'AUCUN autre
// fichier de l'app. Partout ailleurs, on utilise le middleware partagé par
// défaut et le pool exporté directement — ce fichier utilisait un pattern
// différent qui provoque soit un crash au démarrage (module introuvable),
// soit un pool `undefined` à l'exécution.
const authenticateToken = require('../middleware/authMiddleware');
const pool = require('../db');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// GET /api/documents/project/:projectId
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      `SELECT d.*, u.name as uploaded_by 
       FROM documents d 
       LEFT JOIN users u ON d.uploaded_by = u.id 
       WHERE d.project_id = $1 
       ORDER BY d.created_at DESC`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents/upload
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  const { project_id, name, category } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const result = await pool.query(
      `INSERT INTO documents (project_id, name, category, file_path, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [project_id, name, category, file.path, file.size, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    // Cleanup uploaded file on error
    fs.unlink(file.path, () => {});
    res.status(500).json({ error: 'Failed to save document metadata' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // First get file path to delete from disk
    const { rows } = await pool.query('SELECT file_path FROM documents WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    const filePath = rows[0].file_path;
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    fs.unlink(filePath, () => {}); // ignore errors
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;