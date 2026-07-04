import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';

const inputCls = "w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";
const labelCls = "text-xs font-bold text-gray-500 uppercase";

const emptyTask = {
  name: '',
  wbs_code: '',
  parent_task_id: '',
  planned_start: '',
  planned_end: '',
  duration_days: '',
  progress_percent: 0,
  planned_cost: '',
  actual_cost: '',
  actual_start: '',
  actual_end: '',
  responsible_user_id: '',
  status: 'not_started',
  notes: '',
  dependencies: '',
  color: '#378ADD',
};

const toDateInput = (value) => value ? String(value).slice(0, 10) : '';

export default function TaskModal({ open, mode = 'add', projectId, task, tasks = [], onClose, onSaved }) {
  const [form, setForm] = useState(emptyTask);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(mode === 'edit' && task ? {
      ...emptyTask,
      ...task,
      parent_task_id: task.parent_task_id || '',
      planned_start: toDateInput(task.planned_start),
      planned_end: toDateInput(task.planned_end),
      actual_start: toDateInput(task.actual_start),
      actual_end: toDateInput(task.actual_end),
      color: task.color || '#378ADD',
    } : emptyTask);
  }, [open, mode, task]);

  if (!open) return null;

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      parent_task_id: form.parent_task_id || null,
      responsible_user_id: form.responsible_user_id || null,
      planned_cost: form.planned_cost || 0,
      actual_cost: form.actual_cost || 0,
      duration_days: form.duration_days || undefined,
    };

    try {
      const url = mode === 'edit'
        ? `http://localhost:5000/api/tasks/${task.id}`
        : `http://localhost:5000/api/projects/${projectId}/tasks`;
      const response = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Erreur lors de la sauvegarde.');
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">{mode === 'edit' ? 'Modifier la tâche' : 'Ajouter une tâche'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className={labelCls}>Nom de la tâche</label>
              <input required className={inputCls} value={form.name || ''} onChange={(e) => setValue('name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>WBS</label>
              <input className={inputCls} value={form.wbs_code || ''} onChange={(e) => setValue('wbs_code', e.target.value)} placeholder="1.2.1" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Début prévu</label>
              <input required type="date" className={inputCls} value={form.planned_start || ''} onChange={(e) => setValue('planned_start', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Fin prévue</label>
              <input required type="date" className={inputCls} value={form.planned_end || ''} onChange={(e) => setValue('planned_end', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Durée</label>
              <input type="number" min="0" className={inputCls} value={form.duration_days || ''} onChange={(e) => setValue('duration_days', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Statut</label>
              <select className={inputCls} value={form.status || 'not_started'} onChange={(e) => setValue('status', e.target.value)}>
                <option value="not_started">Non démarrée</option>
                <option value="in_progress">En cours</option>
                <option value="done">Terminée</option>
                <option value="delayed">En retard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Avancement %</label>
              <input type="number" min="0" max="100" className={inputCls} value={form.progress_percent ?? 0} onChange={(e) => setValue('progress_percent', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Coût prévu</label>
              <input type="number" min="0" className={inputCls} value={form.planned_cost || ''} onChange={(e) => setValue('planned_cost', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Coût réel</label>
              <input type="number" min="0" className={inputCls} value={form.actual_cost || ''} onChange={(e) => setValue('actual_cost', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Couleur</label>
              <input type="color" className={`${inputCls} h-10 p-1`} value={form.color || '#378ADD'} onChange={(e) => setValue('color', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Parent</label>
              <select className={inputCls} value={form.parent_task_id || ''} onChange={(e) => setValue('parent_task_id', e.target.value)}>
                <option value="">Aucun</option>
                {tasks.filter((t) => t.id !== task?.id).map((t) => (
                  <option key={t.id} value={t.id}>{t.wbs_code ? `${t.wbs_code} - ` : ''}{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Début réel</label>
              <input type="date" className={inputCls} value={form.actual_start || ''} onChange={(e) => setValue('actual_start', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Fin réelle</label>
              <input type="date" className={inputCls} value={form.actual_end || ''} onChange={(e) => setValue('actual_end', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Dépendances</label>
            <input className={inputCls} value={form.dependencies || ''} onChange={(e) => setValue('dependencies', e.target.value)} placeholder="3,7" />
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Notes</label>
            <textarea className={`${inputCls} h-20 resize-none`} value={form.notes || ''} onChange={(e) => setValue('notes', e.target.value)} />
          </div>

          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-40 transition-all flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
