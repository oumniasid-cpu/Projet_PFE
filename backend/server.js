require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Routes
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const dashboardRoutes = require("./routes/dashboard");

const app = express();


// ======================
// GLOBAL MIDDLEWARES
// ======================

app.use(cors());
app.use(express.json());


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

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/dashboard", dashboardRoutes);


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
});

module.exports = app;