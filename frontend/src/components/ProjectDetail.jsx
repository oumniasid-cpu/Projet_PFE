import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock, Target, Wallet } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import SideBar from './SideBar';
import EVMCard from './EVMCard';

const C = {
  primary: '#1d37c8',
  pale: '#e6f1fb',
};

const Stat = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: C.pale }}>
      <Icon className="w-5 h-5" color={C.primary} />
    </div>
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/projects/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setProject(await res.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <SideBar />
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen bg-gray-100">
        <SideBar />
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Projet introuvable.</div>
      </div>
    );
  }

  const progress = Number(project.overall_progress || project.progress || 0);
  const planned = Number(project.planned_budget || project.budget_total || 0);
  const actual = Number(project.actual_cost || project.budget_spent || 0);
  const budgetPct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
  const daysRemaining = project.end_date ? Math.max(0, Math.ceil((new Date(project.end_date) - new Date()) / 86400000)) : 0;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <SideBar />
      <main className="flex-1 overflow-y-auto p-6">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour aux projets
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Stat icon={Target} label="Progression" value={`${progress}%`} />
          <Stat icon={Wallet} label="Budget utilise" value={`${budgetPct}%`} />
          <Stat icon={CalendarDays} label="Jours restants" value={daysRemaining} />
          <Stat icon={Clock} label="Statut" value={project.status} />
        </div>
      </main>
    </div>
  );
}
