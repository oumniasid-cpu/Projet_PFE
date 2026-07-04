import React, { useEffect, useState } from 'react';
import { Calendar, FileSpreadsheet, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fmt = (value) => value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';
const money = (value) => Number(value || 0).toLocaleString('fr-FR') + ' DA';

const statusClass = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
  on_hold: 'bg-gray-100 text-gray-700',
  'on-hold': 'bg-gray-100 text-gray-700',
};

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/projects', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setProjects(await res.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-6 text-sm text-gray-400">Chargement...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
              <th className="px-6 py-4">Projet</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4">Progression</th>
              <th className="px-6 py-4">Budget</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((project) => {
              const progress = Number(project.overall_progress ?? project.progress ?? 0);
              const planned = Number(project.planned_budget ?? project.budget_total ?? 0);
              const actual = Number(project.actual_cost ?? project.budget_spent ?? 0);
              const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
              const SourceIcon = project.import_source === 'msproject' ? FolderOpen : FileSpreadsheet;
              return (
                <tr key={project.id} className="hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-4">
                    <button onClick={() => navigate(`/projects/${project.id}`)} className="text-sm font-bold text-gray-900 hover:text-blue-700">
                      {project.name}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${statusClass[project.status] || 'bg-gray-100 text-gray-700'}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold">{progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <p className="font-bold text-gray-900">{money(actual)} / {money(planned)}</p>
                    <p className="text-gray-400 text-[10px]">{pct}% consommé</p>
                  </td>
                  <td className="px-6 py-4 text-[10px] text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {fmt(project.start_date)} → {fmt(project.end_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <SourceIcon className="w-4 h-4 text-blue-600" />
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => navigate(`/projects/${project.id}`)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                      Voir détails
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
