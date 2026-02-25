import React from 'react';

const GanttChart = ({ projects = [] }) => {
  // Si pas de projets, afficher un message
  if (!projects || projects.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Gantt Chart</h3>
        <div className="text-center py-12 text-gray-500">
          <p>Aucun projet actif à afficher</p>
          <p className="text-sm mt-2">Créez votre premier projet pour voir le diagramme de Gantt</p>
        </div>
      </div>
    );
  }

  // Générer les mois pour l'affichage
  const generateMonths = () => {
    const months = [];
    const now = new Date();
    
    for (let i = -1; i <= 5; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        name: date.toLocaleDateString('fr-FR', { month: 'short' }),
        fullDate: date
      });
    }
    
    return months;
  };

  const months = generateMonths();
  const monthWidth = 100 / months.length;

  // Calculer la position et la durée d'un projet
  const getProjectPosition = (project) => {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const firstMonth = months[0].fullDate;
    const lastMonth = new Date(months[months.length - 1].fullDate);
    lastMonth.setMonth(lastMonth.getMonth() + 1);

    // Calculer le mois de début (position)
    const monthsFromStart = (startDate.getFullYear() - firstMonth.getFullYear()) * 12 
                          + (startDate.getMonth() - firstMonth.getMonth());
    
    // Calculer la durée en mois
    const duration = (endDate.getFullYear() - startDate.getFullYear()) * 12 
                   + (endDate.getMonth() - startDate.getMonth()) + 1;

    return {
      left: Math.max(0, (monthsFromStart + 1) * monthWidth),
      width: duration * monthWidth,
      isVisible: startDate <= lastMonth && endDate >= firstMonth
    };
  };

  // Obtenir la couleur en fonction du statut
  const getProjectColor = (project) => {
    if (project.isDelayed) {
      return 'bg-red-500';
    }
    if (project.progress >= 100) {
      return 'bg-green-500';
    }
    if (project.status === 'active') {
      return 'bg-blue-500';
    }
    return 'bg-gray-400';
  };

  // Obtenir le label de statut
  const getStatusLabel = (project) => {
    if (project.progress >= 100) return 'Terminé';
    if (project.isDelayed) return 'En retard';
    if (project.status === 'active') return 'En cours';
    return 'Planifié';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Gantt Chart - Projets Actifs ({projects.length})
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* En-tête des mois */}
          <div className="flex border-b border-gray-200 mb-4">
            <div className="w-56 flex-shrink-0"></div>
            <div className="flex-1 flex">
              {months.map((month, index) => (
                <div
                  key={index}
                  className="text-center font-medium text-sm text-gray-600 pb-2"
                  style={{ width: `${monthWidth}%` }}
                >
                  {month.name}
                </div>
              ))}
            </div>
          </div>

          {/* Lignes de projets */}
          <div className="space-y-3">
            {projects.map((project) => {
              const position = getProjectPosition(project);
              
              if (!position.isVisible) return null;

              return (
                <div key={project.id} className="flex items-center">
                  {/* Nom du projet */}
                  <div className="w-56 flex-shrink-0 pr-4">
                    <div className="text-sm font-medium text-gray-900 truncate" title={project.name}>
                      {project.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getStatusLabel(project)} • {project.progress}%
                    </div>
                  </div>

                  {/* Barre de Gantt */}
                  <div className="flex-1 relative h-12">
                    {/* Grille de fond */}
                    <div className="absolute inset-0 flex">
                      {months.map((_, i) => (
                        <div
                          key={i}
                          className="border-r border-gray-100"
                          style={{ width: `${monthWidth}%` }}
                        ></div>
                      ))}
                    </div>

                    {/* Ligne "aujourd'hui" */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                      style={{ left: `${monthWidth}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-xs text-red-500 font-medium whitespace-nowrap">
                        Aujourd'hui
                      </div>
                    </div>

                    {/* Barre de progression */}
                    <div
                      className={`absolute top-1/2 transform -translate-y-1/2 h-9 ${getProjectColor(project)} rounded-md shadow-sm flex items-center justify-between px-3 overflow-hidden`}
                      style={{
                        left: `${position.left}%`,
                        width: `${Math.min(position.width, 100 - position.left)}%`
                      }}
                    >
                      <span className="text-white text-xs font-medium truncate">
                        {project.name}
                      </span>
                      <span className="text-white text-xs font-bold ml-2">
                        {project.progress}%
                      </span>
                    </div>

                    {/* Indicateur de retard */}
                    {project.isDelayed && (
                      <div
                        className="absolute -top-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded"
                        style={{
                          left: `${position.left + position.width}%`,
                          transform: 'translateX(-100%)'
                        }}
                      >
                        ⚠ Retard
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="mt-6 flex items-center gap-6 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Terminé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-gray-600">En cours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-600">En retard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span className="text-gray-600">Planifié</span>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-600">
            {projects.filter(p => p.progress >= 100).length}
          </div>
          <div className="text-xs text-gray-600">Terminés</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">
            {projects.filter(p => p.status === 'active' && !p.isDelayed).length}
          </div>
          <div className="text-xs text-gray-600">En cours</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">
            {projects.filter(p => p.isDelayed).length}
          </div>
          <div className="text-xs text-gray-600">En retard</div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;