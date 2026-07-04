import {
  Briefcase, Calendar, MapPin, RefreshCw,
  Search, Clock, Plus, FileSpreadsheet,
  FolderOpen, Building2, ChevronDown
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import SideBar from '../components/SideBar';
import { NewProject, ImportExcelModal, ImportMSProjectModal } from '../components/newProject';
import ProjectDetails from '../components/ProjectDetails';
import ImportModal from '../components/ImportModal';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  // Modal states
  const [modalManual, setModalManual] = useState(false);
  const [modalExcel, setModalExcel] = useState(false);
  const [modalMSProject, setModalMSProject] = useState(false);
  const [modalImport, setModalImport] = useState(false);

  // Dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleProjectCreated = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/projects', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Erreur lors du chargement des projets');
      setProjects(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  if (selectedProjectId) {
    return <ProjectDetails projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
  }

  if (loading) return (
    <div className="flex h-screen bg-gray-100">
      <SideBar />
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-screen bg-gray-100">
      <SideBar />
      <div className="flex-1 flex items-center justify-center text-center p-6">
        <div>
          <p className="text-red-500 font-bold mb-4">⚠️ {error}</p>
          <button onClick={fetchProjects} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <SideBar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Projets</h1>

            <div className="flex gap-2 items-center">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white"
                />
              </div>

              <button
                onClick={() => setModalImport(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Importer un projet
              </button>

              {/* ── DROPDOWN BUTTON ── */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau
                  <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden">

                    {/* Option 1 – Manual */}
                    <button
                      onClick={() => { setDropdownOpen(false); setModalManual(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Créer manuellement</p>
                        <p className="text-xs text-gray-400">Formulaire de création</p>
                      </div>
                    </button>

                    <div className="h-px bg-gray-100 mx-3" />

                    {/* Option 2 – Excel */}
                    <button
                      onClick={() => { setDropdownOpen(false); setModalExcel(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-50 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Importer Excel</p>
                        <p className="text-xs text-gray-400">Fichier .xlsx / .xls</p>
                      </div>
                    </button>

                    <div className="h-px bg-gray-100 mx-3" />

                    {/* Option 3 – MS Project */}
                    <button
                      onClick={() => { setDropdownOpen(false); setModalMSProject(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                        <FolderOpen className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Importer MS Project</p>
                        <p className="text-xs text-gray-400">Fichier XML exporté</p>
                      </div>
                    </button>

                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 text-[10px] uppercase tracking-widest font-bold">
                    <th className="px-6 py-4">Détails du Projet</th>
                    <th className="px-6 py-4">Localisation</th>
                    <th className="px-6 py-4">Budget (Utilisé/Total)</th>
                    <th className="px-6 py-4">Status & Progrès</th>
                    <th className="px-6 py-4">Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.isArray(projects) && projects.length > 0 ? (
                    projects.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className="hover:bg-gray-50/50 transition-all cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{p.name}</p>
                              <p className="text-[11px] text-gray-400 truncate max-w-45">{p.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <MapPin className="w-3 h-3 text-red-400" />
                            <span>{p.location_city}, {p.location_country}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs">
                            <p className="font-bold text-gray-900">{formatCurrency(p.budget_spent)}</p>
                            <p className="text-gray-400 text-[10px]">sur {formatCurrency(p.budget_total)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase
                              ${p.status === 'active' ? 'bg-green-100 text-green-700'
                                : p.status === 'on-hold' ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'}`}>
                              {p.status}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full" style={{ width: `${p.progress}%` }} />
                              </div>
                              <span className="text-[10px] font-bold">{p.progress}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[10px] text-gray-500 space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Début: {formatDate(p.start_date)}
                            </div>
                            <div className="flex items-center gap-1 font-bold text-blue-600">
                              <Clock className="w-3 h-3" />
                              Fin: {formatDate(p.end_date)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">
                        Aucun projet trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>

      {/* Modals */}
      <NewProject open={modalManual} onOpenChange={setModalManual} onProjectCreated={handleProjectCreated} />
      <ImportExcelModal open={modalExcel} onOpenChange={setModalExcel} onProjectCreated={handleProjectCreated} />
      <ImportMSProjectModal open={modalMSProject} onOpenChange={setModalMSProject} onProjectCreated={handleProjectCreated} />
      <ImportModal open={modalImport} onOpenChange={setModalImport} onImported={fetchProjects} />
    </div>
  );
};

export default Projects;
