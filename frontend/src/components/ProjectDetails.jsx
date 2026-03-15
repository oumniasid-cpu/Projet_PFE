import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Calendar, Users, Clock,
  Layers, Wallet, FileText, AlertTriangle, 
  Plus, Download, ChevronRight 
} from 'lucide-react';
import GanttChart from '../components/GanttChart';

// --- COMPOSANT BUDGET MIS À JOUR ---
const BudgetPlaceholder = ({ project }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <h3 className="font-bold text-[#062419] mb-4">Financial Summary</h3>
      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="text-gray-500">Estimated Budget</span>
          <span className="font-semibold">{Number(project.budget_total).toLocaleString()} DA</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Actual Spent</span>
          <span className="font-semibold text-[#E9C46A]">{Number(project.budget_spent).toLocaleString()} DA</span>
        </div>
      </div>
    </div>
  </div>
);

export default function ProjectDetails({ projectId, onBack }) {
  const [activeTab, setActiveTab] = useState('budget');
  const [project, setProject] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  const fetchProjectDetails = async () => {
    try {
      const token = localStorage.getItem('token'); // Récupération du token
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`, // Ajout indispensable du token
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error("Project not found");
      }

      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error("Error fetching project details:", error);
    } finally {
      setLoading(false); // Assurez-vous d'arrêter le chargement
    }
  };

  if (projectId) fetchProjectDetails();
}, [projectId]);

  // 2. Charger les rapports quand l'onglet est actif
  useEffect(() => {
    if (activeTab === 'daily-reports' && projectId) {
      fetch(`http://localhost:5000/api/reports/project/${projectId}`)
        .then(res => res.json())
        .then(data => setReports(data))
        .catch(err => console.error(err));
    }
  }, [activeTab, projectId]);

  if (loading) return <div className="p-20 text-center">Loading Project...</div>;
  if (!project) return <div className="p-20 text-center">Project not found.</div>;

  const budgetPercent = (project.budget_spent / project.budget_total) * 100;

  const tabs = [
    { id: 'budget', label: 'Budget Tracking', icon: Wallet },
    { id: 'gantt', label: 'Gantt Planning', icon: Layers },
    { id: 'daily-reports', label: 'Daily Reports', icon: FileText },
    { id: 'alerts', label: 'AI Alerts', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-4 lg:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#062419]">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col lg:flex-row justify-between gap-8">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-[#062419]">{project.name}</h1>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                  {project.status}
                </span>
              </div>
              <p className="text-gray-500">{project.description}</p>
              <div className="flex flex-wrap gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> <span>{new Date(project.start_date).toLocaleDateString()}</span></div>
                <div className="flex items-center gap-2"><Users className="w-4 h-4" /> <span>Manager: {project.owner_name}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> <span>{project.progress}% Complete</span></div>
              </div>
            </div>

            {/* Budget Widget */}
            <div className="lg:w-72 bg-[#F8F9FA] rounded-3xl p-6 border border-gray-100">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget Used</span>
                <span className="text-xs font-bold text-blue-600">{budgetPercent.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-4">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(budgetPercent, 100)}%` }} className="h-full bg-[#E9C46A]" />
              </div>
              <div className="text-2xl font-bold text-[#062419]">
                {(project.budget_spent / 1000).toFixed(0)}k DA
                <span className="text-sm text-gray-400 font-normal ml-2">/ {(project.budget_total / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 p-1 bg-gray-200/50 rounded-2xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id ? 'bg-white text-[#062419] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          {activeTab === 'budget' && <BudgetPlaceholder project={project} />}
          
          {activeTab === 'gantt' && (
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <GanttChart projectId={projectId} />
            </div>
          )}

          {activeTab === 'daily-reports' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <h3 className="font-bold text-[#062419]">Rapports de chantier</h3>
                <button className="flex items-center gap-2 bg-[#062419] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-gray-200">
                  <Plus className="w-4 h-4" /> New Report
                </button>
              </div>
              
              {reports.length > 0 ? (
                <div className="grid gap-3">
                  {reports.map(r => (
                    <div key={r.id} className="bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between group cursor-pointer hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><FileText size={18}/></div>
                        <div>
                          <p className="font-bold text-sm text-[#062419]">Rapport du {new Date(r.report_date).toLocaleDateString()}</p>
                          <p className="text-[11px] text-gray-400">Rédigé par {r.author_name}</p>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                  <FileText className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-500 italic text-sm">Aucun rapport soumis pour ce projet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-start gap-4 text-red-700">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="font-bold">AI Detection: Delay Risk</h4>
                <p className="text-sm opacity-80">Supply chain logistics for this project are 4 days behind schedule based on recent reports.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}