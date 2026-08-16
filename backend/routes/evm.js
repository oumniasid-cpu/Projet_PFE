const express = require('express');
const router = express.Router();
const evmController = require('../controllers/evmController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/evm/:projectId?date=YYYY-MM-DD
router.get('/:projectId', authMiddleware, evmController.getProjectEVM);

module.exports = router;