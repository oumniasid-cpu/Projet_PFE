import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';

const inputCls = "w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";
const labelCls = "text-xs font-bold text-gray-500 uppercase";

export default function ImportModal({ open, onOpenChange, onImported }) {
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState(null);
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');

  if (!open) return null;

  const sourceLabel = file?.name?.toLowerCase().endsWith('.xml')
    ? 'MS Project XML'
    : file?.name?.toLowerCase().endsWith('.xlsx')
      ? 'Excel'
      : '';

  const reset = () => {
    setProjectName('');
    setFile(null);
    setState('idle');
    setMessage('');
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (!['xlsx', 'xml'].includes(ext)) {
      setState('error');
      setMessage('Type de fichier invalide. Utilisez .xlsx ou .xml.');
      return;
    }

    setState('uploading');
    setMessage('');
    const form = new FormData();
    form.append('project_name', projectName);
    form.append('owner_id', localStorage.getItem('user_id') || '');
    form.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/import/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de l’importation.');
      }
      setState('success');
      setMessage(`${result.tasks_count} tâches importées avec succès.`);
      await onImported?.();
      setTimeout(close, 700);
    } catch (error) {
      setState('error');
      setMessage(error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Importer un projet</h2>
              <p className="text-xs text-gray-400">Excel .xlsx ou MS Project XML</p>
            </div>
          </div>
          <button onClick={close} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className={labelCls}>Nom du projet</label>
            <input
              required
              className={inputCls}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="ex: Résidence El Bahia"
            />
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Fichier</label>
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group block">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300 group-hover:text-blue-500 transition-colors" />
              <p className="text-sm font-bold text-gray-700">{file ? file.name : 'Cliquez pour choisir un fichier'}</p>
              <p className="text-xs text-gray-400 mt-1">Formats acceptés : .xlsx, .xml</p>
              <input
                type="file"
                accept=".xlsx,.xml"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setState('idle');
                  setMessage('');
                }}
              />
            </label>
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
            <span>Source détectée : <strong className="text-gray-700">{sourceLabel || 'Aucune'}</strong></span>
            <a href="/templates/project_import_template.xlsx" download className="font-bold text-blue-600 hover:text-blue-700">
              Télécharger le modèle Excel
            </a>
          </div>

          {message && (
            <div className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
              state === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}>
              {state === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={close} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={!projectName || !file || state === 'uploading'}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              {state === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
              {state === 'uploading' ? 'Importation...' : 'Importer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
