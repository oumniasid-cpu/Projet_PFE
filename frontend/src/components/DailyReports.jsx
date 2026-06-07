import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Send, AlertCircle, CheckCircle2, 
  Loader2, Upload, FileCode 
} from 'lucide-react';
import SideBar from './SideBar';

const DailyReports = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const fileInputRef = useRef(null); // Pour déclencher l'input file caché

  const [formData, setFormData] = useState({
    project_id: '',
    work_done: '',
    issues: '',
    weather: 'Sunny',
    manpower: ''
  });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur chargement projets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  // --- LOGIQUE D'IMPORTATION MS PROJECT ---
  const handleImportMSProject = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setMessage({ type: '', text: '' });

    const data = new FormData();
    data.append('mppFile', file); // 'mppFile' doit correspondre à upload.single('mppFile') côté backend

    try {
      // Dans handleImportMSProject
      const response = await fetch('http://localhost:5000/api/projects/import-mpp', { //
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Indispensable car la route est protégée
        },
        body: data
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Importation réussie : ${result.count} tâches ajoutées.` });
        fetchProjects(); // Rafraîchir la liste des projets
      } else {
        throw new Error(result.message || "Erreur lors de l'importation");
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset de l'input
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setMessage({ type: "success", text: "Rapport envoyé avec succès !" });
    }, 1500);
  
  };




 return (
  <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f3f4f6' }}>
    <SideBar />

    {/* Scrollable right side */}
    <div style={{ flex: 1, overflowY: 'auto', padding: '36px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Alert */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium
          ${message.type === "success"
            ? "bg-blue-50 text-blue-900 border border-blue-200"
            : "bg-red-50 text-red-700 border border-red-100"}`}>
          {message.type === "success"
            ? <CheckCircle2 className="w-5 h-5 text-blue-700" />
            : <AlertCircle className="w-5 h-5" />}
          <p>{message.text}</p>
        </div>
      )}

      {/* Card — constrained width, not full page */}
      <div
        className="bg-white rounded-2xl p-6 border"
        style={{
          maxWidth: 720,
          borderColor: "#b5d4f4",
          boxShadow: "0 2px 12px rgba(29,55,200,0.06)"
        }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7 pb-6 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ background: "#1d37c8" }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: "#042c53" }}>Rapport</h2>
              <p className="text-sm mt-0.5" style={{ color: "#378add" }}>
                Gérez vos projets ou importez un fichier MPP
              </p>
            </div>
          </div>

          <div>
            <input
              type="file"
              accept=".mpp"
              ref={fileInputRef}
              onChange={handleImportMSProject}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
              style={{ background: "#1d37c8" }}
              onMouseEnter={e => e.currentTarget.style.background = "#0c447c"}
              onMouseLeave={e => e.currentTarget.style.background = "#1d37c8"}
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
              {importing ? "Importation..." : "Importer MS Project"}
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "#1d37c8" }}>
              Concerned project
            </label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm p-4 rounded-xl border border-dashed border-blue-200 bg-blue-50 text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Mise à jour de la liste...
              </div>
            ) : (
              <select
                required
                value={formData.project_id}
                onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full p-4 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  background: "#e6f1fb",
                  border: "1.5px solid #b5d4f4",
                  color: formData.project_id ? "#042c53" : "#9ca3af",
                }}
                onFocus={e => e.target.style.borderColor = "#1d37c8"}
                onBlur={e => e.target.style.borderColor = "#b5d4f4"}
              >
                <option value="" style={{ color: "#9ca3af" }}>Select an active project</option>
                {projects.map(proj => (
                  <option key={proj.id} value={proj.id} style={{ color: "#374151" }}>🏗️ {proj.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: "#1d37c8" }}>
              Realised work
            </label>
            <textarea
              required
              rows={4}
              value={formData.work_done}
              onChange={e => setFormData({ ...formData, work_done: e.target.value })}
              placeholder="Décrivez les tâches accomplies..."
              className="w-full p-4 rounded-xl text-sm outline-none transition-all resize-none"
              style={{
                background: "#e6f1fb",
                border: "1.5px solid #b5d4f4",
                color: "#042c53",
              }}
              onFocus={e => e.target.style.borderColor = "#1d37c8"}
              onBlur={e => e.target.style.borderColor = "#b5d4f4"}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !formData.project_id}
            className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all text-white"
            style={{ background: submitting || !formData.project_id ? "#85b7eb" : "#1d37c8" }}
          >
            {submitting
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><Send className="w-5 h-5" /> Envoyer le rapport</>}
          </button>
        </form>
      </div>
    </div>
  </div>
);
};
export default DailyReports;