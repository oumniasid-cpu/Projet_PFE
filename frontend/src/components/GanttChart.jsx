import React, { useState, useEffect } from "react";

const GanttChart = ({ projectId }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CHARGEMENT DES DONNÉES RÉELLES ---
  useEffect(() => {
    const fetchGanttData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/dashboard/gantt/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setProjects(Array.isArray(data) ? data : [data]); // On s'assure que c'est un tableau
      } catch (error) {
        console.error("Erreur Gantt:", error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchGanttData();
  }, [projectId]);

  if (loading) return <div className="p-6 text-center text-gray-500">Chargement du diagramme...</div>;

  if (!projects || projects.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Diagramme de Gantt</h3>
        <div className="text-center py-12 text-gray-500">
          <p>Aucune donnée de planification disponible</p>
        </div>
      </div>
    );
  }

  // --- LOGIQUE DE GÉNÉRATION DU CALENDRIER ---
  const generateMonths = () => {
    const months = [];
    const now = new Date();
    // On centre la vue sur le début du projet
    const startView = new Date(projects[0].start_date);
    
    for (let i = -1; i <= 6; i++) {
      const date = new Date(startView.getFullYear(), startView.getMonth() + i, 1);
      months.push({
        name: date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        fullDate: date,
      });
    }
    return months;
  };

  const months = generateMonths();
  const monthWidth = 100 / months.length;

  const getProjectPosition = (project) => {
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);
    const firstMonthView = months[0].fullDate;

    // Calcul de la position en pourcentage
    const diffMonthsStart = (startDate.getFullYear() - firstMonthView.getFullYear()) * 12 + (startDate.getMonth() - firstMonthView.getMonth());
    const durationMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;

    return {
      left: Math.max(0, diffMonthsStart * monthWidth),
      width: Math.max(5, durationMonths * monthWidth), // Minimum 5% de largeur pour la visibilité
    };
  };

  // ... (Gardez vos fonctions getProjectColor et getStatusLabel identiques)

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-6">Planification Temporelle</h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-200">
          {/* Header des mois */}
          <div className="flex border-b border-gray-100 mb-4">
            <div className="w-48 shrink-0 font-bold text-xs text-gray-400 uppercase">Phase / Projet</div>
            <div className="flex-1 flex">
              {months.map((m, i) => (
                <div key={i} style={{ width: `${monthWidth}%` }} className="text-center text-xs font-bold text-gray-400 uppercase">
                  {m.name}
                </div>
              ))}
            </div>
          </div>

          {/* Lignes du Gantt */}
          <div className="space-y-4">
            {projects.map((p) => {
              const pos = getProjectPosition(p);
              return (
                <div key={p.id} className="flex items-center group">
                  <div className="w-48 shrink-0 pr-4">
                    <div className="text-sm font-bold text-gray-700 truncate">{p.name}</div>
                    <div className="text-[10px] text-gray-400">{p.progress}% complété</div>
                  </div>
                  
                  <div className="flex-1 relative h-10 bg-gray-50/50 rounded-lg">
                    {/* Barres de progression */}
                    <div
                      className={`absolute top-2 h-6 rounded-full shadow-sm transition-all duration-500 flex items-center px-3 ${
                        p.progress >= 100 ? 'bg-green-500' : 'bg-blue-600'
                      }`}
                      style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                    >
                      <span className="text-[9px] text-white font-bold truncate">
                        {p.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;