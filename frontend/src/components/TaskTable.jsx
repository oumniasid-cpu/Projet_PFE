import React, { useMemo, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';

const fmt = (value) => value ? new Date(value).toLocaleDateString('fr-FR') : '-';
const money = (value) => Number(value || 0).toLocaleString('fr-FR') + ' DA';

const statusClasses = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
};

const statusLabels = {
  not_started: 'Non démarrée',
  in_progress: 'En cours',
  done: 'Terminée',
  delayed: 'En retard',
};

const progressColor = (task) => {
  const progress = Number(task.progress_percent || 0);
  if (task.is_delayed || progress < 40) return 'bg-red-500';
  if (progress < 80) return 'bg-orange-400';
  return 'bg-green-500';
};

export default function TaskTable({ tasks = [], onAdd, onEdit, onDelete }) {
  const [sort, setSort] = useState({ key: 'wbs_code', dir: 'asc' });
  const [confirmId, setConfirmId] = useState(null);

  const depthById = useMemo(() => {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const depthOf = (task, seen = new Set()) => {
      if (!task?.parent_task_id || seen.has(task.id)) return 0;
      seen.add(task.id);
      return 1 + depthOf(byId.get(task.parent_task_id), seen);
    };
    return new Map(tasks.map((task) => [task.id, depthOf(task)]));
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    const list = [...tasks];
    list.sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      const result = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === 'asc' ? result : -result;
    });
    return list;
  }, [tasks, sort]);

  const toggleSort = (key) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  const headers = [
    ['wbs_code', 'WBS'],
    ['name', 'Nom de la tâche'],
    ['planned_start', 'Début prévu'],
    ['planned_end', 'Fin prévue'],
    ['duration_days', 'Durée'],
    ['progress_percent', 'Avancement'],
    ['planned_cost', 'Coût prévu'],
    ['actual_cost', 'Coût réel'],
    ['status', 'Statut'],
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Tableau des tâches</h3>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} tâche{tasks.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Ajouter une tâche
        </button>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-gray-500 font-medium">Aucune tâche. Commencez par en ajouter une.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                {headers.map(([key, label]) => (
                  <th key={key} onClick={() => toggleSort(key)} className="px-4 py-3 cursor-pointer select-none">
                    {label}{sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTasks.map((task) => {
                const progress = Number(task.progress_percent || 0);
                const depth = depthById.get(task.id) || 0;
                return (
                  <tr key={task.id} className={`transition-colors ${task.is_delayed ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-4 py-3 text-xs font-bold text-gray-600">{task.wbs_code || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900" style={{ paddingLeft: 16 + depth * 16 }}>
                      {task.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(task.planned_start)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(task.planned_end)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{task.duration_days || 0} j</td>
                    <td className="px-4 py-3 min-w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${progressColor(task)}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-bold w-9 text-right">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{money(task.planned_cost)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{money(task.actual_cost)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${statusClasses[task.status] || statusClasses.not_started}`}>
                        {statusLabels[task.status] || task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {confirmId === task.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-600">Confirmer?</span>
                          <button onClick={() => onDelete(task.id)} className="text-xs font-bold text-red-600 hover:text-red-700">Oui</button>
                          <button onClick={() => setConfirmId(null)} className="text-xs font-bold text-gray-500 hover:text-gray-700">Non</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => onEdit(task)} className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </button>
                          <button onClick={() => setConfirmId(task.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
