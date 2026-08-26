import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

// Libellés lisibles pour les indicateurs EVM déclenchant une alerte
const INDICATOR_LABELS = {
  IPC: 'Performance des coûts (IPC)',
  IPD: 'Performance des délais (IPD)',
};

/**
 * AlertsCard
 * ==========
 * Affiche les alertes générées automatiquement par alertsService.js
 * (dépassement de seuil IPC/IPD). Chaque alerte a la forme :
 *   { id, indicator, severity, message, threshold, indicator_value,
 *     project_id, project_name, created_at, is_read, is_resolved }
 *
 * Props :
 *   alerts      - tableau d'alertes (voir forme ci-dessus)
 *   onMarkRead  - (alertId) => void, appelé au clic sur "Marquer comme lue"
 *   onSelect    - (projectId) => void, appelé au clic sur une alerte (aller au projet)
 *   visibleCount- nombre d'alertes affichées avant le bouton "Voir plus" (défaut 3)
 */
const AlertsCard = ({ alerts = [], onMarkRead, onSelect, visibleCount = 3 }) => {
  const [showAll, setShowAll] = useState(false);

  const hasAlerts = alerts.length > 0;
  const visibleAlerts = showAll ? alerts : alerts.slice(0, visibleCount);
  const remaining = alerts.length - visibleAlerts.length;

  const getAlertStyles = (severity) => {
    if (severity === 'critical') {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    return 'bg-yellow-50 border-yellow-200 text-yellow-800';
  };

  const getIconColor = (severity) => {
    if (severity === 'critical') return 'text-red-600';
    return 'text-yellow-600';
  };

  const getIcon = (severity) => {
    if (severity === 'critical') return AlertOctagon;
    return AlertTriangle;
  };

  const getTitle = (alert) => {
    const label = INDICATOR_LABELS[alert.indicator] || alert.indicator;
    return alert.project_name ? `${alert.project_name} — ${label}` : label;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-4">Smart Alerts & Predictions</h3>

      {!hasAlerts ? (
        <div className="p-4 rounded-lg border bg-green-50 border-green-200 text-green-800">
          <div className="flex gap-3">
            <AlertCircle className="shrink-0 text-green-600" size={20} />
            <div>
              <h4 className="font-semibold text-sm mb-1">Aucune alerte</h4>
              <p className="text-xs leading-relaxed">
                Tous vos projets sont sur la bonne voie ! Continuez comme ça.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAlerts.map((alert) => {
            const Icon = getIcon(alert.severity);
            return (
              <div
                key={alert.id}
                onClick={() => onSelect?.(alert.project_id)}
                className={`p-4 rounded-lg border ${getAlertStyles(alert.severity)} ${onSelect ? 'cursor-pointer hover:brightness-95 transition' : ''}`}
              >
                <div className="flex gap-3">
                  <Icon className={`shrink-0 ${getIconColor(alert.severity)}`} size={20} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{getTitle(alert)}</h4>
                    <p className="text-xs leading-relaxed">{alert.message}</p>
                    {onMarkRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // ne pas déclencher onSelect en même temps
                          onMarkRead(alert.id);
                        }}
                        className="text-xs mt-2 underline opacity-70 hover:opacity-100"
                      >
                        Marquer comme lue
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          Voir plus ({remaining} de plus) →
        </button>
      )}
    </div>
  );
};

export default AlertsCard;