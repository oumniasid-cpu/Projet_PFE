import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Send, AlertCircle, CheckCircle2, 
  Loader2, Upload, FileCode 
} from 'lucide-react';

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
    // Logique d'envoi du rapport classique...
    setSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      
      {/* Alert Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8">
        
        {/* Header avec bouton Importation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#062419]">Rapport Journalier</h2>
              <p className="text-sm text-gray-400">Gérez vos projets ou importez un fichier MPP</p>
            </div>
          </div>

          {/* Bouton Importation MS Project */}
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
              className="flex items-center gap-2 px-5 py-2.5 bg-[#E9C46A] text-[#062419] rounded-xl font-bold text-sm hover:bg-[#d4b159] transition-all shadow-sm disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileCode className="w-4 h-4" />
              )}
              {importing ? "Importation..." : "Importer MS Project"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Projet Concerné</label>
            <div className="relative">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Loader2 className="w-4 h-4 animate-spin" /> Mise à jour de la liste...
                </div>
              ) : (
                <select 
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                  className="w-full p-4 bg-[#F8F9FA] border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-[#062419] transition-all"
                >
                  <option value="">-- Sélectionnez un projet actif --</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.id}>🏗️ {proj.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">Travaux Réalisés</label>
            <textarea 
              required
              rows="4"
              value={formData.work_done}
              onChange={(e) => setFormData({...formData, work_done: e.target.value})}
              placeholder="Décrivez les tâches accomplies..."
              className="w-full p-4 bg-[#F8F9FA] border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={submitting || !formData.project_id}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#062419] text-white hover:bg-[#0a3525]'
            }`}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Envoyer le rapport</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DailyReports;