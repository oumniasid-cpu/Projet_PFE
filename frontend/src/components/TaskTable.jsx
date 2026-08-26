import React, { useMemo, useState, useEffect } from 'react';
import { Edit2, Plus, Trash2, Save } from 'lucide-react';

export default function TaskTable({ tasks = [], onAdd, onEdit, onDelete }) {
  const [sort] = useState({ key: 'wbs_code', dir: 'asc' });
  const [confirmId, setConfirmId] = useState(null);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [dirtyIds, setDirtyIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    setLocalTasks(tasks);
    setDirtyIds(new Set());
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    const list = [...localTasks];
    list.sort((a, b) => {
      const result = String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), undefined, { numeric: true });
      return sort.dir === 'asc' ? result : -result;
    });
    return list;
  }, [localTasks, sort]);

  const toggleStatus = (taskId) => {
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: t.status === 'done' ? 'not_started' : 'done' } : t
      )
    );
    setDirtyIds((prev) => new Set(prev).add(taskId));
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (dirtyIds.size === 0) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const changed = localTasks.filter((t) => dirtyIds.has(t.id));
      await Promise.all(
        changed.map((t) =>
          fetch(`http://localhost:5000/api/tasks/${t.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: t.status }),
          }).then((res) => {
            if (!res.ok) throw new Error(`Échec pour la tâche ${t.id}`);
          })
        )
      );
      setDirtyIds(new Set());
      setSaveMessage({ type: 'success', text: 'Modifications enregistrées.' });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message || "Erreur lors de l'enregistrement." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Tableau des tâches</h3>
          <p className="mt-0.5 text-sm text-slate-500">{tasks.length} tâche{tasks.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={`text-xs font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage.text}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={dirtyIds.size === 0 || saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button onClick={onAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Ajouter une tâche
          </button>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-medium text-slate-500">Aucune tâche. Commencez par en ajouter une.</p>
        </div>
      ) : (
        <div className="w-full">
          {sortedTasks.map((task) => {
            const isDone = task.status === 'done';
            const isConfirming = confirmId === task.id;
            return (
              <div
                key={task.id}
                className="group flex min-h-16 w-full items-center justify-between gap-5 border-b border-slate-200 px-5 py-4 last:border-b-0 hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                                    <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggleStatus(task.id)}
                    aria-label={`Tâche ${task.name} ${isDone ? 'terminée' : 'non terminée'}`}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded border border-slate-400 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white"
                    style={{
                      appearance: 'none',
                      backgroundColor: isDone ? '#1d37c8' : 'transparent',
                      backgroundImage: isDone ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='white' d='m13.2 3.6-6.5 6.5-3-3L2.3 8.5l4.4 4.4 7.9-7.9z'/%3E%3C/svg%3E\")" : 'none',
                    }}
                  />
                  <span className="truncate text-sm font-medium text-slate-900">{task.name}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!isConfirming ? (
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button onClick={() => onEdit(task)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" title="Modifier">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmId(task.id)} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600" title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="text-red-600">Supprimer ?</span>
                      <button onClick={() => onDelete(task.id)} className="text-red-600 hover:text-red-700">Oui</button>
                      <button onClick={() => setConfirmId(null)} className="text-slate-500 hover:text-slate-900">Non</button>
                    </div>
                  )}
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-700">
                    {task.status || 'not_started'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
