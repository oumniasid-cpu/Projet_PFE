const pool = require('../db');

// Récupérer tous les projets
exports.getAllProjects = async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Récupérer un projet par ID (Correction de la requête)
exports.getProjectById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT p.*, u.name as owner_name 
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching project by ID:', err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};