import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

const AlertsCard = ({ alerts = [] }) => {
  // Alertes par défaut si aucune alerte
  const defaultAlerts = [
    {
      type: 'warning',
      title: 'Aucune alerte',
      message: 'Tous vos projets sont sur la bonne voie ! Continuez comme ça.',
      icon: AlertCircle
    }
  ];

  const displayAlerts = alerts.length > 0 ? alerts : defaultAlerts;

  const getAlertStyles = (type) => {
    if (type === 'error') {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    return 'bg-yellow-50 border-yellow-200 text-yellow-800';
  };

  const getIconColor = (type) => {
    if (type === 'error') return 'text-red-600';
    return 'text-yellow-600';
  };

  const getIcon = (type) => {
    if (type === 'error') return AlertCircle;
    return AlertTriangle;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-4">Smart Alerts & Predictions</h3>
      <div className="space-y-3">
        {displayAlerts.map((alert, index) => {
          const Icon = getIcon(alert.type);
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getAlertStyles(alert.type)}`}
            >
              <div className="flex gap-3">
                <Icon className={`flex-shrink-0 ${getIconColor(alert.type)}`} size={20} />
                <div>
                  <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                  <p className="text-xs leading-relaxed">{alert.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {alerts.length > 3 && (
        <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          View more ({alerts.length - 3} more) →
        </button>
      )}
    </div>
  );
};

export default AlertsCard;