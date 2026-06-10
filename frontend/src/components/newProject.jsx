import React, { useState, useRef } from 'react';
import { X, Building2, Upload, FileSpreadsheet, FolderOpen } from 'lucide-react';
import * as XLSX from 'xlsx';

// ── SHARED STYLES ──────────────────────────────────────────
const inputCls = "w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";
const labelCls = "text-xs font-bold text-gray-500 uppercase";

// ─────────────────────────────────────────────────────────────
// 1. MANUAL CREATE MODAL
// ─────────────────────────────────────────────────────────────
export function NewProject({ open, onOpenChange, onProjectCreated }) {
  const [formData, setFormData] = useState({
    name: '', description: '', budget_total: '',
    start_date: '', end_date: '',
    location_city: '', location_country: '', status: 'planning'
  });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onProjectCreated(await res.json());
        onOpenChange(false);
        setFormData({ name: '', description: '', budget_total: '', start_date: '', end_date: '', location_city: '', location_country: '', status: 'planning' });
      } else {
        alert("Erreur lors de la création du projet");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Building2 className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold text-gray-900">Nouveau Projet</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Nom du Projet</label>
              <input required className={inputCls} value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="ex: Tour Résidentielle" />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Budget Total (DZD)</label>
              <input required type="number" className={inputCls} value={formData.budget_total}
                onChange={e => setFormData({ ...formData, budget_total: e.target.value })}
                placeholder="1500000" />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} h-20 resize-none`} value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Ville</label>
              <input className={inputCls} value={formData.location_city}
                onChange={e => setFormData({ ...formData, location_city: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Pays</label>
              <input className={inputCls} value={formData.location_country}
                onChange={e => setFormData({ ...formData, location_country: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Date de début</label>
              <input required type="date" className={inputCls} value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Date de fin prévue</label>
              <input required type="date" className={inputCls} value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 transition-all">
              {loading ? 'Création...' : 'Créer le Projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. IMPORT FROM EXCEL MODAL
// ─────────────────────────────────────────────────────────────
export function ImportExcelModal({ open, onOpenChange, onProjectCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // parsed project data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  if (!open) return null;

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rows.length) { setError("Le fichier est vide."); return; }

        // Flexible column mapping (case-insensitive)
        const r = rows[0];
        const key = (candidates) => {
          const keys = Object.keys(r);
          for (const c of candidates) {
            const found = keys.find(k => k.toLowerCase().includes(c.toLowerCase()));
            if (found) return r[found] ?? '';
          }
          return '';
        };

        const toDateStr = (v) => {
          if (!v) return '';
          if (v instanceof Date) return v.toISOString().split('T')[0];
          const d = new Date(v);
          return isNaN(d) ? '' : d.toISOString().split('T')[0];
        };

        setPreview({
          name: String(key(['name', 'nom', 'projet', 'title']) || ''),
          description: String(key(['description', 'desc']) || ''),
          budget_total: String(key(['budget', 'total', 'montant']) || ''),
          start_date: toDateStr(key(['start', 'début', 'debut', 'commencement'])),
          end_date: toDateStr(key(['end', 'fin', 'livraison'])),
          location_city: String(key(['city', 'ville']) || ''),
          location_country: String(key(['country', 'pays']) || ''),
          status: String(key(['status', 'statut']) || 'planning'),
        });
      } catch {
        setError("Impossible de lire le fichier. Vérifiez le format.");
      }
    };
    reader.readAsBinaryString(f);
  };

  const handleImport = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(preview)
      });
      if (res.ok) {
        onProjectCreated(await res.json());
        onOpenChange(false);
        setFile(null); setPreview(null);
      } else {
        setError("Erreur lors de l'import.");
      }
    } catch (err) {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><FileSpreadsheet className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Importer depuis Excel</h2>
              <p className="text-xs text-gray-400">Format .xlsx ou .xls</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all group"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300 group-hover:text-green-500 transition-colors" />
            {file
              ? <p className="text-sm font-bold text-green-600">{file.name}</p>
              : <>
                <p className="text-sm font-semibold text-gray-500">Cliquez pour choisir un fichier</p>
                <p className="text-xs text-gray-400 mt-1">Excel (.xlsx, .xls)</p>
              </>
            }
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          </div>

          {/* Template hint */}
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
            <p className="font-bold text-gray-700 mb-1">Colonnes attendues :</p>
            <p>name · description · budget_total · start_date · end_date · location_city · location_country · status</p>
          </div>

          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

          {/* Preview */}
          {preview && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-bold text-blue-700 text-xs uppercase mb-2">Aperçu du projet importé</p>
              {[
                ['Nom', preview.name],
                ['Budget', preview.budget_total ? `${Number(preview.budget_total).toLocaleString()} DZD` : '—'],
                ['Début', preview.start_date || '—'],
                ['Fin', preview.end_date || '—'],
                ['Ville', preview.location_city || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{val}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
              Annuler
            </button>
            <button onClick={handleImport} disabled={!preview || loading}
              className="px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 disabled:opacity-40 transition-all">
              {loading ? 'Import...' : 'Importer le Projet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. IMPORT FROM MS PROJECT MODAL
// ─────────────────────────────────────────────────────────────
export function ImportMSProjectModal({ open, onOpenChange, onProjectCreated }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  if (!open) return null;

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');

    // Parse XML-based .mpp / .xml MS Project export
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(evt.target.result, 'text/xml');

        const getText = (tag) => xml.querySelector(tag)?.textContent?.trim() || '';
        const toDateStr = (v) => {
          if (!v) return '';
          const d = new Date(v);
          return isNaN(d) ? '' : d.toISOString().split('T')[0];
        };

        setPreview({
          name: getText('Title') || getText('Name') || f.name.replace(/\.[^.]+$/, ''),
          description: getText('Subject') || getText('Comments') || '',
          budget_total: getText('CostVariance') || getText('Baseline0BudgetCost') || '',
          start_date: toDateStr(getText('StartDate') || getText('Start')),
          end_date: toDateStr(getText('FinishDate') || getText('Finish')),
          location_city: '',
          location_country: '',
          status: 'planning',
        });
      } catch {
        setError("Impossible de lire le fichier. Exportez en format XML depuis MS Project.");
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(preview)
      });
      if (res.ok) {
        onProjectCreated(await res.json());
        onOpenChange(false);
        setFile(null); setPreview(null);
      } else {
        setError("Erreur lors de l'import.");
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><FolderOpen className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Importer depuis MS Project</h2>
              <p className="text-xs text-gray-400">Format XML exporté depuis MS Project</p>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all group"
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300 group-hover:text-orange-500 transition-colors" />
            {file
              ? <p className="text-sm font-bold text-orange-600">{file.name}</p>
              : <>
                <p className="text-sm font-semibold text-gray-500">Cliquez pour choisir un fichier</p>
                <p className="text-xs text-gray-400 mt-1">MS Project XML (.xml)</p>
              </>
            }
            <input ref={fileRef} type="file" accept=".xml,.mpp" className="hidden" onChange={handleFile} />
          </div>

          {/* How-to hint */}
          <div className="bg-orange-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
            <p className="font-bold text-orange-700">Comment exporter depuis MS Project ?</p>
            <p>Fichier → Enregistrer sous → Format XML (.xml)</p>
          </div>

          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

          {/* Preview */}
          {preview && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-bold text-orange-700 text-xs uppercase mb-2">Aperçu du projet importé</p>
              {[
                ['Nom', preview.name],
                ['Début', preview.start_date || '—'],
                ['Fin', preview.end_date || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{val}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-1">Vous pourrez compléter les autres champs après l'import.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button onClick={() => onOpenChange(false)}
              className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
              Annuler
            </button>
            <button onClick={handleImport} disabled={!preview || loading}
              className="px-5 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-200 disabled:opacity-40 transition-all">
              {loading ? 'Import...' : 'Importer le Projet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}