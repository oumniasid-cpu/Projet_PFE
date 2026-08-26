const pool = require('../db');
const { createAlertsIfNew } = require('../services/alertsService');

/**
 * Calcule les indicateurs EVM (Earned Value Management) à partir des tâches d'un projet.
 * Formules basées sur PMI (2017) / PMBOK.
 */
function calculateEVM(tasks, analysisDate) {
    let BAC = 0, VP = 0, VA = 0, CR = 0;

    tasks.forEach((task) => {
        const plannedCost = parseFloat(task.planned_cost) || 0;
        const actualCost = parseFloat(task.actual_cost) || 0;
        const progress = parseFloat(task.progress_percent) || 0;

        BAC += plannedCost;
        CR += actualCost;
        VA += plannedCost * (progress / 100);

        // VP : proportion du planned_cost qui devrait être "consommée" à la date d'analyse,
        // selon une répartition linéaire entre planned_start et planned_end.
        if (task.planned_start && task.planned_end) {
            const start = new Date(task.planned_start);
            const end = new Date(task.planned_end);
            const totalDays = Math.max((end - start) / 86400000, 1);

            if (analysisDate >= end) {
                VP += plannedCost; // tâche entièrement planifiée à cette date
            } else if (analysisDate > start) {
                const elapsedDays = (analysisDate - start) / 86400000;
                VP += plannedCost * (elapsedDays / totalDays);
            }
            // si analysisDate <= start, VP += 0 (rien planifié encore)
        }
    });

    const EC = VA - CR;
    const ED = VA - VP;
    const IPC = CR !== 0 ? VA / CR : null;
    const IPD = VP !== 0 ? VA / VP : null;
    const EAC = IPC ? BAC / IPC : null;
    const ETC = EAC !== null ? EAC - CR : null;
    const VAC = EAC !== null ? BAC - EAC : null;
    const TCPI = (BAC - CR) !== 0 ? (BAC - VA) / (BAC - CR) : null;

    return {
        BAC: round2(BAC),
        VP: round2(VP),
        VA: round2(VA),
        CR: round2(CR),
        EC: round2(EC),
        ED: round2(ED),
        IPC: IPC !== null ? round3(IPC) : null,
        IPD: IPD !== null ? round3(IPD) : null,
        EAC: EAC !== null ? round2(EAC) : null,
        ETC: ETC !== null ? round2(ETC) : null,
        VAC: VAC !== null ? round2(VAC) : null,
        TCPI: TCPI !== null ? round3(TCPI) : null,
    };
}

function round2(n) {
    return Math.round(n * 100) / 100;
}
function round3(n) {
    return Math.round(n * 1000) / 1000;
}

/**
 * GET /api/evm/:projectId?date=YYYY-MM-DD
 * Retourne les indicateurs EVM calculés pour un projet, à une date d'analyse donnée
 * (aujourd'hui par défaut). Vérifie aussi automatiquement les seuils d'alerte
 * (IPC/IPD) et crée les alertes correspondantes si nécessaire (étape 5).
 */
exports.getProjectEVM = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { date } = req.query;
        const analysisDate = date ? new Date(date) : new Date();

        const tasksResult = await pool.query(
            `SELECT id, title, planned_cost, actual_cost, progress_percent,
              planned_start, planned_end, status
       FROM tasks
       WHERE project_id = $1`,
            [projectId]
        );

        if (tasksResult.rows.length === 0) {
            return res.status(404).json({
                error: "Aucune tâche trouvée pour ce projet. L'EVM nécessite des tâches avec planned_cost, planned_start et planned_end renseignés.",
            });
        }

        const indicators = calculateEVM(tasksResult.rows, analysisDate);

        // Estimation du retard en jours, basée sur la durée contractuelle du projet
        const projectResult = await pool.query(
            `SELECT start_date, end_date FROM projects WHERE id = $1`,
            [projectId]
        );

        let delayEstimateDays = null;
        if (projectResult.rows.length > 0 && indicators.IPD !== null) {
            const { start_date, end_date } = projectResult.rows[0];
            const totalDuration = Math.max((new Date(end_date) - new Date(start_date)) / 86400000, 1);
            delayEstimateDays = Math.round((1 - indicators.IPD) * totalDuration);
        }

        // --- Étape 5 : vérification automatique des seuils IPC/IPD ---
        // On ne déclenche l'évaluation que si IPC et IPD ont pu être calculés
        // (sinon CR ou VP valent 0 et la comparaison n'a pas de sens).
        let newAlerts = [];
        if (indicators.IPC !== null && indicators.IPD !== null) {
            try {
                newAlerts = await createAlertsIfNew(pool, Number(projectId), {
                    IPC: indicators.IPC,
                    IPD: indicators.IPD,
                    retard_jours: delayEstimateDays ?? 0,
                });
            } catch (alertErr) {
                // On ne fait jamais échouer la réponse EVM à cause des alertes :
                // on log seulement, le calcul EVM reste la priorité de cet endpoint.
                console.error('Alert evaluation error:', alertErr);
            }
        }

        res.json({
            projectId: Number(projectId),
            analysisDate: analysisDate.toISOString().split('T')[0],
            indicators,
            delayEstimateDays,
            taskCount: tasksResult.rows.length,
            newAlerts,
        });
    } catch (err) {
        console.error('EVM calculation error:', err);
        res.status(500).json({ error: 'Erreur serveur lors du calcul EVM' });
    }
};