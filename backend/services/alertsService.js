/**
 * services/alertsService.js
 * ==========================
 * Détecte les dépassements de seuil (IPC/IPD) à partir d'un résultat EVM
 * déjà calculé (voir evmEngine.analyzeProject), et gère leur création/
 * dédoublonnage/résolution en base.
 *
 * Emplacement : backend/services/alertsService.js
 */

const DEFAULT_THRESHOLD_IPC = 0.9;
const DEFAULT_THRESHOLD_IPD = 0.9;

/**
 * Compare les indicateurs à leurs seuils et renvoie la liste des alertes
 * à déclencher (peut être vide si tout va bien).
 *
 * @param {object} evmResult - résultat de analyzeProject() (contient IPC, IPD...)
 * @param {{ipc?: number, ipd?: number}} thresholds - seuils spécifiques au projet (optionnels)
 */
function evaluateThresholds(evmResult, thresholds = {}) {
  const thresholdIpc = thresholds.ipc ?? DEFAULT_THRESHOLD_IPC;
  const thresholdIpd = thresholds.ipd ?? DEFAULT_THRESHOLD_IPD;

  const alerts = [];

  if (evmResult.IPC < thresholdIpc) {
    alerts.push({
      indicator: "IPC",
      severity: evmResult.IPC < thresholdIpc * 0.85 ? "critical" : "warning",
      threshold: thresholdIpc,
      indicatorValue: evmResult.IPC,
      message: `Indice de performance des coûts (IPC = ${evmResult.IPC.toFixed(3)}) sous le seuil de ${thresholdIpc}. Le projet dépense plus que la valeur produite.`,
    });
  }

  if (evmResult.IPD < thresholdIpd) {
    alerts.push({
      indicator: "IPD",
      severity: evmResult.IPD < thresholdIpd * 0.85 ? "critical" : "warning",
      threshold: thresholdIpd,
      indicatorValue: evmResult.IPD,
      message: `Indice de performance des délais (IPD = ${evmResult.IPD.toFixed(3)}) sous le seuil de ${thresholdIpd}. Le chantier accuse un retard (${Math.round(evmResult.retard_jours)} jours estimés).`,
    });
  }

  return alerts;
}

/**
 * Crée les alertes en base pour les seuils dépassés, SAUF s'il existe déjà
 * une alerte ouverte (non résolue) du même type pour ce projet — pour ne
 * pas spammer une alerte identique à chaque rapport journalier.
 *
 * Renvoie la liste des alertes réellement créées (nouvelles uniquement).
 */
async function createAlertsIfNew(pool, projectId, evmResult, options = {}) {
  const { dailyReportId = null, thresholds = {} } = options;

  const candidateAlerts = evaluateThresholds(evmResult, thresholds);
  if (candidateAlerts.length === 0) return [];

  const created = [];

  for (const alert of candidateAlerts) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM alerts
       WHERE project_id = $1 AND indicator = $2 AND is_resolved = FALSE
       LIMIT 1`,
      [projectId, alert.indicator]
    );

    if (existing.length > 0) {
      // Une alerte du même type est déjà ouverte : on ne duplique pas.
      continue;
    }

    const { rows } = await pool.query(
      `INSERT INTO alerts
          (project_id, indicator, severity, threshold, indicator_value, message, daily_report_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        projectId, alert.indicator, alert.severity,
        alert.threshold, alert.indicatorValue, alert.message, dailyReportId,
      ]
    );
    created.push(rows[0]);
  }

  // Auto-résolution : si un indicateur repasse au-dessus du seuil, on
  // referme automatiquement les alertes ouvertes correspondantes.
  const stillBreached = new Set(candidateAlerts.map((a) => a.indicator));
  const allIndicators = ["IPC", "IPD"];
  for (const indicator of allIndicators) {
    if (!stillBreached.has(indicator)) {
      await pool.query(
        `UPDATE alerts SET is_resolved = TRUE, resolved_at = CURRENT_TIMESTAMP
         WHERE project_id = $1 AND indicator = $2 AND is_resolved = FALSE`,
        [projectId, indicator]
      );
    }
  }

  return created;
}

/** Liste les alertes d'un projet (les plus récentes d'abord). */
async function listAlerts(pool, projectId, { unreadOnly = false } = {}) {
  const query = unreadOnly
    ? `SELECT * FROM alerts WHERE project_id = $1 AND is_read = FALSE ORDER BY created_at DESC`
    : `SELECT * FROM alerts WHERE project_id = $1 ORDER BY created_at DESC`;
  const { rows } = await pool.query(query, [projectId]);
  return rows;
}

/** Marque une alerte comme lue. */
async function markAlertRead(pool, alertId) {
  const { rows } = await pool.query(
    `UPDATE alerts SET is_read = TRUE WHERE id = $1 RETURNING *`,
    [alertId]
  );
  return rows[0] || null;
}

module.exports = {
  evaluateThresholds,
  createAlertsIfNew,
  listAlerts,
  markAlertRead,
  DEFAULT_THRESHOLD_IPC,
  DEFAULT_THRESHOLD_IPD,
};