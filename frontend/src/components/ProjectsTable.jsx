// frontend/src/components/ProjectsTable.jsx
import React, { useState } from 'react';

const STATUS_CONFIG = {
  active:    { label: 'En cours',  bg: 'bg-blue-100',   text: 'text-blue-700'   },
  planning:  { label: 'Planifié',  bg: 'bg-gray-100',   text: 'text-gray-600'   },
  completed: { label: 'Terminé',   bg: 'bg-green-100',  text: 'text-green-700'  },
  'on-hold': { label: 'En pause',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  cancelled: { label: 'Annulé',    bg: 'bg-red-100',    text: 'text-red-600'    },
};

const FILTERS = [
  { key: 'all',       label: 'Tous'      },
  { key: 'active',    label: 'En cours'  },
  { key: 'planning',  label: 'Planifiés' },
  { key: 'completed', label: 'Terminés'  },
  { key: 'delayed',   label: 'En retard' },
];

const fmt = (d) => d
  ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'N/A';

const fmtBudget = (n) => Number(n || 0).toLocaleString('fr-FR') + ' DA';

export default function ProjectsTable({ projects = [] }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Filtrage
  const filtered = projects.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'all')       return true;
    if (filter === 'delayed')   return p.isDelayed;
    if (filter === 'completed') return p.progress >= 100;
    return p.status === filter;
  });

  const progressColor = (p) => {
    if (p.isDelayed)       return 'bg-red-500';
    if (p.progress >= 100) return 'bg-green-500';
    if (p.progress >= 60)  return 'bg-blue-500';
    return 'bg-orange-400';
  };

  const statusBadge = (p) => {
    if (p.isDelayed) return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        ⚠ En retard
      </span>
    );
    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.planning;
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    );
  };

  // Compteurs footer
  const counts = {
    done:    projects.filter(p => p.progress >= 100).length,
    active:  projects.filter(p => p.status === 'active' && p.progress < 100).length,
    delayed: projects.filter(p => p.isDelayed).length,
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* En-tête */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Tous mes Projets</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {projects.length} projet{projects.length > 1 ? 's' : ''} — données en temps réel depuis la base
            </p>
          </div>
          {/* Recherche */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-300 w-52"
            />
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-5xl mb-3">🏗️</div>
          <p className="text-gray-500 font-medium">Aucun projet trouvé</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Projet', 'Statut', 'Progression', 'Budget', 'Dates', 'Tâches'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide first:pl-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const budgetOver = p.budgetSpent > p.budgetPlanned && p.budgetPlanned > 0;
                const budgetPct  = p.budgetPlanned > 0
                  ? Math.round((p.budgetSpent / p.budgetPlanned) * 100) : 0;

                return (
                  <tr key={p.id} className="hover:bg-blue-50/20 transition-colors group">

                    {/* Nom */}
                    <td className="px-6 py-4 max-w-xs">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {p.name}
                      </p>
                      {p.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.description}</p>
                      )}
                      {p.location && (
                        <p className="text-xs text-gray-400 mt-0.5">📍 {p.location}</p>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-4">{statusBadge(p)}</td>

                    {/* Progression */}
                    <td className="px-4 py-4 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${progressColor(p)}`}
                            style={{ width: `${Math.min(p.progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-700 w-9 text-right">
                          {p.progress}%
                        </span>
                      </div>
                    </td>

                    {/* Budget */}
                    <td className="px-4 py-4">
                      <p className={`text-sm font-semibold ${budgetOver ? 'text-red-600' : 'text-gray-800'}`}>
                        {fmtBudget(p.budgetSpent)}
                      </p>
                      <p className="text-xs text-gray-400">/ {fmtBudget(p.budgetPlanned)}</p>
                      {budgetOver
                        ? <p className="text-xs text-red-500 font-medium">⚠ +{budgetPct - 100}% dépassement</p>
                        : <p className="text-xs text-gray-400">{budgetPct}% consommé</p>
                      }
                    </td>

                    {/* Dates */}
                    <td className="px-4 py-4">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Début :</span> {fmt(p.startDate)}
                      </p>
                      <p className={`text-xs mt-0.5 ${p.isDelayed ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
                        <span className="font-medium">Fin :</span> {fmt(p.endDate)}
                        {p.isDelayed && ' ⚠'}
                      </p>
                    </td>

                    {/* Tâches */}
                    <td className="px-4 py-4">
                      {p.tasks ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {p.tasks.done}
                            <span className="text-gray-400 font-normal">/{p.tasks.total}</span>
                          </p>
                          {p.nextMilestone && (
                            <p className="text-xs text-blue-600 mt-0.5 truncate max-w-28"
                               title={p.nextMilestone}>
                              📌 {p.nextMilestone}
                            </p>
                          )}
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {projects.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center flex-wrap gap-2">
          <p className="text-xs text-gray-500">
            {filtered.length} / {projects.length} projet{projects.length > 1 ? 's' : ''}
          </p>
          <div className="flex gap-4 text-xs">
            <span className="text-green-600 font-medium">✅ {counts.done} terminé{counts.done > 1 ? 's' : ''}</span>
            <span className="text-blue-600 font-medium">🔵 {counts.active} en cours</span>
            <span className="text-red-600 font-medium">🔴 {counts.delayed} en retard</span>
          </div>
        </div>
      )}
    </div>
  );
}