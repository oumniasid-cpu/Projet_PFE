const pool = require('../db');

// Rôles qui voient TOUS les projets (pas seulement les leurs).
// Même convention (minuscules) que routes/task_routes.js et import_routes.js.
const GLOBAL_VISIBILITY_ROLES = new Set([
  'admin',
  'maitre_ouvrage',
  "maitre d'ouvrage",
  'maître d’ouvrage',
]);

/**
 * Détermine si l'utilisateur voit tous les projets (rôle admin/MOA)
 * ou seulement les siens (propriétaire OU membre via project_members).
 * Retourne { seesAll: boolean, userId: number }.
 */
async function getProjectVisibility(userId) {
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  const role = String(rows[0]?.role || '').toLowerCase();
  return {
    seesAll: GLOBAL_VISIBILITY_ROLES.has(role),
    userId,
  };
}

/**
 * Clause SQL à insérer après un WHERE (ou AND) pour restreindre aux projets
 * visibles par l'utilisateur. Utilise les paramètres $<seesAllIndex> et $<userIdIndex>.
 * Exemple : `WHERE ${projectVisibilityClause(1, 2)}` avec params = [seesAll, userId]
 */
function projectVisibilityClause(seesAllParamIndex, userIdParamIndex, projectAlias = 'p') {
  return `(
    $${seesAllParamIndex}::boolean = true
    OR ${projectAlias}.owner_id = $${userIdParamIndex}
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = ${projectAlias}.id AND pm.user_id = $${userIdParamIndex}
    )
  )`;
}

module.exports = { getProjectVisibility, projectVisibilityClause, GLOBAL_VISIBILITY_ROLES };