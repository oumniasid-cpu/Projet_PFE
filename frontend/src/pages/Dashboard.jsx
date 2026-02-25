// frontend/src/pages/Dashboard.jsx
import React from 'react';
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';
import ProgressCard from '../components/ProgressCard';
import BudgetCard from '../components/BudgetCard';
import MilestoneCard from '../components/MilestoneCard';
import AlertsCard from '../components/AlertsCard';
import BudgetChart from '../components/BudgetChart';
import GanttChart from '../components/GanttChart';
import ProjectsTable from '../components/ProjectsTable';
import { useDashboardData } from '../hooks/useDashboardData';

export default function Dashboard() {
  const {
    stats,
    projects,      // → GanttChart
    allProjects,   // → ProjectsTable
    alerts,        // → AlertsCard
    budgetHistory, // → BudgetChart
    loading,
    error,
    reload,
  } = useDashboardData();

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <SideBar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Chargement des données...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Erreur ───────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex h-screen bg-gray-100">
        <SideBar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur de chargement</h2>
              <p className="text-gray-600 mb-4 text-sm">{error}</p>
              <button
                onClick={reload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Helpers dates ────────────────────────────────────────
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const getDaysUntil = (date) => {
    if (!date) return 'N/A';
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0)  return 'Passé';
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Demain';
    return `Dans ${days} jours`;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <SideBar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ── 4 KPI Cards ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Progression globale — vient de stats.overallProgress */}
              <ProgressCard progress={stats?.overallProgress || 0} />

              {/* Budget — vient de stats.budgetSpent et stats.budgetPlanned */}
              <BudgetCard
                spent={stats?.budgetSpent   || 0}
                planned={stats?.budgetPlanned || 0}
              />

              {/* Prochain jalon — vient de stats.nextMilestone et stats.milestoneDate */}
              <MilestoneCard
                count={stats?.nextMilestone || 'N/A'}
                date={formatDate(stats?.milestoneDate)}
                daysUntil={getDaysUntil(stats?.milestoneDate)}
              />

              {/* Alertes — vient de alerts[] */}
              <AlertsCard alerts={alerts} />
            </div>

            {/* ── Graphique Budget — vient de budgetHistory[] ── */}
            <BudgetChart budgetHistory={budgetHistory} />

            {/* ── Gantt — vient de projects[] (projets actifs) ── */}
            <GanttChart projects={projects} />

            {/* ── Tableau tous les projets — vient de allProjects[] */}
            {allProjects.length > 0 ? (
              <ProjectsTable projects={allProjects} />
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                <div className="text-5xl mb-4">🏗️</div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">
                  Bienvenue sur BuildTrack !
                </h3>
                <p className="text-blue-700 mb-4 text-sm">
                  Vous n'avez pas encore de projets. Créez votre premier projet pour commencer.
                </p>
                <button
                  onClick={() => window.location.href = '/projects/new'}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                >
                  + Créer mon premier projet
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}