require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- ROUTES PRINCIPALES ---

// Route racine (Health Check)
app.get('/', (req, res) => {
  res.json({ 
    message: 'BuildTrack API',
    version: '1.0.0',
    status: 'running',
    database: 'PostgreSQL'
  });
});

// Montage des routes API
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/dashboard', dashboardRoutes);

// --- GESTION DES ERREURS ---

app.get("/api/projects/:id", async (req, res) => {
  const id = req.params.id;

  const result = await pool.query(
    "SELECT * FROM projects WHERE id=$1",
    [id]
  );

  res.json(result.rows[0]);
});
// Middleware 404 (Route non trouvée)
app.use((req, res, next) => {
  res.status(404).json({ message: "Route non trouvée" });
});

// Middleware d'erreur global (Capture les erreurs de vos routes)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Erreur interne du serveur",
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});



const projectsRoute = require('./routes/projects');



app.use(cors());
app.use(express.json());

app.use('/api/projects', projectsRoute);



// --- DÉMARRAGE DU SERVEUR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   BuildTrack API Server Running       ║
  ║   Port: ${PORT}                          ║
  ║   Database: PostgreSQL                ║
  ║   Env: ${process.env.NODE_ENV || 'dev'}    ║
  ╚═══════════════════════════════════════╝
  `);
});

module.exports = app;