require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

// Routes
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const dashboardRoutes = require("./routes/dashboard");
const importRoutes = require("./routes/import_routes");
const taskRoutes = require("./routes/task_routes");
const documentsRoutes = require('./routes/documents');
const reportsRoutes = require('./routes/reports'); // ⚠️ manquait — jamais monté avant
const { router: notifRouter, startScheduler } = require('./routes/notifications');
const usersRoutes = require('./routes/users');
// analyticsRoutes retiré : dupliquait /api/projects/:id/analytics/task-status
// déjà géré (et mieux géré, avec contrôle de visibilité + normalisation des
// statuts) dans projectController.js via routes/projects.js. Le double montage
// sur '/api/projects' causait une collision de route silencieuse.
const app = express();


app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

// ======================
// GLOBAL MIDDLEWARES
// ======================

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/users', usersRoutes);   // avant le handler 404, comme pour /api/notifications
// ======================
// HEALTH CHECK
// ======================

app.get("/", (req, res) => {
  res.json({
    message: "BuildTrack API",
    version: "1.0.0",
    status: "running",
    database: "PostgreSQL"
  });
});


// ======================
// API ROUTES
// ======================

app.use('/api/documents', documentsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/import", importRoutes);
app.use("/api/reports", reportsRoutes);
app.use('/api/notifications', notifRouter);   // doit être monté AVANT le handler 404 ci-dessous
app.use("/api", taskRoutes);
app.use('/api/evm', require('./routes/evm'));


// ======================
// 404 HANDLER
// ======================

app.use((req, res) => {
  res.status(404).json({
    message: "Route non trouvée"
  });
});


// ======================
// GLOBAL ERROR HANDLER
// ======================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Erreur interne du serveur",
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});


// ======================
// SERVER START
// ======================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║       BuildTrack API Running          ║
║       Port: ${PORT}                     ║
║       Database: PostgreSQL            ║
║       Env: ${process.env.NODE_ENV || "dev"} ║
╚═══════════════════════════════════════╝
`);
  startScheduler(); // e-mails différés / résumés horaires et quotidiens
});

module.exports = app;