require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');      // ← AJOUTÉ
const dashboardRoutes = require('./routes/dashboard');   // ← AJOUTÉ

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'BuildTrack API',
    version: '1.0.0',
    status: 'running',
    database: 'PostgreSQL'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);                 // ← AJOUTÉ
app.use('/api/dashboard', dashboardRoutes);              // ← AJOUTÉ

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   BuildTrack API Server Running       ║
  ║   Port: ${PORT}                       ║
  ║   Database: PostgreSQL                ║
  ╚═══════════════════════════════════════╝
  `);
});

module.exports = app;