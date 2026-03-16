import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import SideBar from '../components/SideBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatMoney = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '—';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000)     return (num / 1_000).toFixed(1) + 'k';
  return num.toString();
};

// Map DB status strings → display label + Tailwind color classes
const STATUS_MAP = {
  'active':    { label: 'Actif',    bg: 'bg-green-100',  text: 'text-green-700'  },
  'on track':  { label: 'En cours', bg: 'bg-blue-100',   text: 'text-blue-700'   },
  'at risk':   { label: 'À risque', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'delayed':   { label: 'Retardé',  bg: 'bg-red-100',    text: 'text-red-700'    },
  'completed': { label: 'Terminé',  bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

const getStatus = (status) =>
  STATUS_MAP[status?.toLowerCase()] || { label: status || '—', bg: 'bg-gray-100', text: 'text-gray-600' };


// ─── Main Component ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const navigate              = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const res = await fetch('http://localhost:5000/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) { navigate('/login'); return; }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || `Erreur ${res.status}`);
        }

        setData(await res.json());
      } catch (err) {
        console.error('Erreur stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-500">Chargement des données...</p>
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-gray-700 font-semibold">Erreur de chargement</p>
        <p className="text-gray-400 text-sm">{error || 'Données indisponibles'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Réessayer
        </button>
      </div>
    </div>
  );

  // Safe arrays
  const budgetHistory      = Array.isArray(data.budgetHistory)      ? data.budgetHistory      : [];
  const individualProgress = Array.isArray(data.individualProgress) ? data.individualProgress : [];
  const recentProjects     = Array.isArray(data.recentProjects)     ? data.recentProjects     : [];

  const { metrics } = data;
  const budgetHealth  = metrics.total_budget > 0
    ? ((metrics.total_budget - metrics.total_spent) / metrics.total_budget) * 100
    : 0;
  const isUnderBudget = budgetHealth >= 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <SideBar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1>
              <p className="text-gray-500 mt-1">Aperçu en temps réel de vos chantiers.</p>
            </div>
            <Link to="/projects">
              <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                Voir tous les projets <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {/* ── KPI Cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Projets Actifs */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Projets Actifs</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.active_projects}</p>
              </div>
            </div>

            {/* Budget Total */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isUnderBudget ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Budget Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatMoney(metrics.total_budget)} DA</p>
                <p className={`text-xs mt-0.5 font-medium ${isUnderBudget ? 'text-green-600' : 'text-red-500'}`}>
                  {formatMoney(metrics.total_spent)} DA dépensés
                </p>
              </div>
            </div>

            {/* Progression Moyenne */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Progression Moyenne</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.avg_progress}%</p>
                {/* Mini progress bar */}
                <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1.5">
                  <div
                    className="h-1.5 bg-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(metrics.avg_progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Alertes */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-50 text-red-500">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Alertes</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.alerts}</p>
                {metrics.alerts > 0 && (
                  <p className="text-xs text-red-400 mt-0.5">Nécessite attention</p>
                )}
              </div>
            </div>

          </div>

          {/* ── Charts Row ─────────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Area Chart — Budget vs Dépenses */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-800">Aperçu Budgétaire</h3>
                  <p className="text-sm text-gray-400 mt-0.5">Dépenses cumulées vs budget prévu</p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                    <span className="text-gray-500">Prévu</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                    <span className="text-gray-500">Consommé</span>
                  </span>
                </div>
              </div>

              {budgetHistory.length === 0 ? (
                <EmptyState message="Aucune donnée budgétaire disponible." height="h-[280px]" />
              ) : (
                <div className="h-70">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={budgetHistory}>
                      <defs>
                        <linearGradient id="gradBudget" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                        </linearGradient>
                        <linearGradient id="gradSpent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis
                        dataKey="month"
                        axisLine={false} tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false} tickLine={false}
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(v) => formatMoney(v)}
                      />
                      <Tooltip
                        formatter={(value, name) => [`${formatMoney(value)} DA`, name]}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      />
                      <Area type="monotone" dataKey="budget" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gradBudget)" name="Prévu"    />
                      <Area type="monotone" dataKey="spent"  stroke="#ef4444" strokeWidth={2.5} fill="url(#gradSpent)"  name="Consommé" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Horizontal Bar Chart — Avancement par projet */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800">Avancement par Projet</h3>
                <p className="text-sm text-gray-400 mt-0.5">Complétion en pourcentage</p>
              </div>

              {individualProgress.length === 0 ? (
                <EmptyState message="Aucun projet récent." height="h-[280px]" />
              ) : (
                <div className="h-70">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={individualProgress} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        axisLine={false} tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false} tickLine={false}
                        width={90}
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(v) => [`${v}%`, 'Avancement']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="progress" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Avancement" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>

          {/* ── Recent Projects Table ───────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Table header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Projets Récents</h3>
                <p className="text-sm text-gray-400 mt-0.5">Aperçu rapide des derniers chantiers</p>
              </div>
              <Link to="/projects">
                <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition">
                  Voir tout <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>

            {/* Rows */}
            {recentProjects.length === 0 ? (
              <EmptyState message="Aucun projet trouvé." height="h-32" />
            ) : (
              <div className="divide-y divide-gray-50">
                {recentProjects.map((project) => {
                  const budgetPct     = project.budget_total > 0
                    ? (project.budget_spent / project.budget_total) * 100
                    : 0;
                  const isOverBudget  = budgetPct > 100;
                  const statusStyle   = getStatus(project.status);

                  return (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      {/* Project name + client */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-0.5">
                          <h4 className="font-medium text-gray-800 truncate">{project.name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 truncate">{project.client}</p>
                      </div>

                      {/* Progress bar */}
                      <div className="hidden sm:block w-32 shrink-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400">Avancement</span>
                          <span className="font-semibold text-gray-700">{project.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              project.progress > 80 ? 'bg-green-500' :
                              project.progress < 30 ? 'bg-red-400'   : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(project.progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Budget */}
                      <div className="hidden md:block text-right w-28 shrink-0">
                        <p className={`text-sm font-semibold ${isOverBudget ? 'text-red-500' : 'text-green-600'}`}>
                          {formatMoney(project.budget_spent)} DA
                        </p>
                        <p className="text-xs text-gray-400">
                          sur {formatMoney(project.budget_total)} DA
                        </p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

// ─── EmptyState ───────────────────────────────────────────────────────────────
const EmptyState = ({ message, height = 'h-40' }) => (
  <div className={`flex items-center justify-center ${height} text-gray-300 text-sm`}>
    {message}
  </div>
);

export default Dashboard;