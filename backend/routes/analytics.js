const express = require('express');
const { authenticate } = require('../middleware/auth');
const { pool } = require('../db');

const router = express.Router();

// GET /api/projects/:id/analytics/task-status
router.get('/:id/analytics/task-status', authenticate, async (req, res) => {
  const projectId = req.params.id;
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status IN ('not_started', 'todo')) as not_started,
         COUNT(*) FILTER (WHERE status IN ('in_progress', 'in-progress')) as in_progress,
         COUNT(*) FILTER (WHERE status IN ('done', 'completed')) as done
       FROM tasks
       WHERE project_id = $1`,
      [projectId]
    );
    res.json(result.rows[0] || { not_started: 0, in_progress: 0, done: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch task status' });
  }
});

// GET /api/projects/:id/analytics/progress-over-time
// Returns monthly actual progress and target (example using simulated data)
router.get('/:id/analytics/progress-over-time', authenticate, async (req, res) => {
  // In a real scenario, you'd query actual progress per month from tasks/completed_at.
  // For demonstration, we return static data, but you can replace with actual logic.
  const sample = {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    actual: [35, 44, 54, 61, 66, 70],
    target: [40, 50, 57, 63, 70, 77]
  };
  res.json(sample);
});

// GET /api/projects/:id/analytics/budget-breakdown
// Returns estimated vs actual per project (or per task category)
router.get('/:id/analytics/budget-breakdown', authenticate, async (req, res) => {
  // Example: aggregate by some category; here we use static data.
  const sample = {
    labels: ['Downtown', 'Harbor', 'Riverside', 'Tech'],
    estimated: [12, 28, 8, 45],
    actual: [7, 17, 4, 33]
  };
  res.json(sample);
});

module.exports = router;