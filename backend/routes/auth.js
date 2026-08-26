const express = require('express');
const router = express.Router();
const { login, register, updateProfile } = require('../controllers/authController');

// Même middleware partagé que le reste de l'app (tasks.js, dashboard.js,
// projects.js...) — plus de duplication locale de jwt.verify().
const authenticateToken = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// PUT /api/auth/profile
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;