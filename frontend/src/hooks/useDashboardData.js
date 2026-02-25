// frontend/src/hooks/useDashboardData.js
import { useState, useEffect, useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Fetch avec JWT ────────────────────────────────────────────
const authFetch = async (endpoint) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return null;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Erreur ${res.status}`);
  }
  return res.json();
};

// ─────────────────────────────────────────────────────────────
export const useDashboardData = () => {
  const [stats,         setStats]         = useState(null);
  const [projects,      setProjects]      = useState([]);  // Gantt
  const [allProjects,   setAllProjects]   = useState([]);  // Tableau
  const [alerts,        setAlerts]        = useState([]);
  const [budgetHistory, setBudgetHistory] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 4 appels en parallèle vers le backend
      const [statsData, budgetData, ganttData, projectsData] = await Promise.all([
        authFetch('/dashboard/stats'),
        authFetch('/dashboard/budget-history'),
        authFetch('/dashboard/gantt'),
        authFetch('/dashboard/projects'),
      ]);

      if (!statsData) return; // redirigé vers /login

      // ── Stats : lecture directe depuis la réponse PLATE ────
      // Le contrôleur retourne maintenant une structure plate :
      // { overallProgress, budgetSpent, budgetPlanned, nextMilestone, milestoneDate, alerts }
      setStats({
        overallProgress:   statsData.overallProgress  || 0,
        budgetSpent:       statsData.budgetSpent       || 0,
        budgetPlanned:     statsData.budgetPlanned     || 0,
        nextMilestone:     statsData.nextMilestone     || null,
        milestoneDate:     statsData.milestoneDate     || null,
        milestoneProject:  statsData.milestoneProject  || null,
        totalProjects:     statsData.totalProjects     || 0,
        activeProjects:    statsData.activeProjects    || 0,
      });

      setAlerts(statsData.alerts           || []);
      setBudgetHistory(budgetData?.history || []);
      setProjects(ganttData?.projects      || []);
      setAllProjects(projectsData?.projects || []);

    } catch (err) {
      console.error('[useDashboardData]', err);
      setError(err.message || 'Impossible de charger le dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return {
    stats,
    projects,      // → GanttChart
    allProjects,   // → ProjectsTable
    alerts,        // → AlertsCard
    budgetHistory, // → BudgetChart
    loading,
    error,
    reload: loadAll,
  };
};