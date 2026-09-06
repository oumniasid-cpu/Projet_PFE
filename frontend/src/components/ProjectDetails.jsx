import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, Users, Clock,
  Layers, Wallet, FileText, AlertTriangle,
  Plus, ChevronRight, BarChart2, Target, TrendingDown, CalendarDays,
  Upload, Search, FileCheck, Map, ClipboardList, MoreHorizontal, ListTodo
} from 'lucide-react';
import GanttChart from '../components/GanttChart';
import Sidebar from '../components/SideBar';
import EVMCard from './EVMCard';
import TaskTable from './TaskTable';
import TaskModal from './TaskModal';
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Filler
);

// ── THEME ──────────────────────────────────────────────────
const C = {
  primary: '#1d37c8',
  mid: '#378add',
  light: '#85b7eb',
  lighter: '#b5d4f4',
  pale: '#e6f1fb',
  dark: '#042c53',
  deep: '#0c447c',
  medium: '#185fa5',
};

// ── SHARED AXIS STYLE ──────────────────────────────────────
const axis = {
  ticks: { color: C.mid, font: { size: 11 } },
  grid: { color: 'rgba(55,138,221,0.1)' },
  border: { display: false },
};

// ── CURRENCY FORMAT (Dinar Algérien) ────────────────────────
// budgetByTask.estimated/actual come straight from planned_cost/actual_cost
// in DA (raw amounts, not pre-scaled to millions like the old demo data),
// so the suffix (K/M) must be picked from the real magnitude of each value
// instead of being hardcoded.
const formatDA = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M DA';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K DA';
  return n.toLocaleString('fr-FR') + ' DA';
};
const ChartLegend = ({ items }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
    {items.map(({ color, label, dashed }) => (
      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.medium }}>
        <span style={{
          width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0,
          border: dashed ? `1px dashed ${C.mid}` : 'none', display: 'inline-block',
        }} />
        {label}
      </span>
    ))}
  </div>
);

// ── STAT CARD ──────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, desc }) => (
  <div style={{ background: C.pale, borderRadius: 18, padding: 20 }}>
    <div style={{
      width: 38, height: 38, borderRadius: 10, background: '#d0e8ff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    }}>
      <Icon size={18} color={C.primary} />
    </div>
    <p style={{ fontSize: 12, color: C.medium, marginBottom: 4 }}>{label}</p>
    <p style={{ fontSize: 24, fontWeight: 700, color: C.primary }}>{value}</p>
    <p style={{ fontSize: 12, color: C.mid, marginTop: 4 }}>{desc}</p>
  </div>
);

// ── ANALYTICS TAB ──────────────────────────────────────────
const AnalyticsTab = ({ projectId, authToken, project }) => {
  const [taskStatus, setTaskStatus] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  // NEW: on-time rate + reports count, sourced from the consolidated
  // /analytics endpoint (the only place these two numbers are computed).
  const [summary, setSummary] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState(null);

  // UPDATED: Fetch all analytics data in one effect
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const load = async () => {
      setStatusLoading(true);
      setStatusError(null);
      try {
        const headers = { Authorization: `Bearer ${authToken}` };

        // 1. Task status
        const statusRes = await fetch(
          `http://localhost:5000/api/projects/${projectId}/analytics/task-status`,
          { headers }
        );
        if (!statusRes.ok) throw new Error(`Task status error ${statusRes.status}`);
        const statusData = await statusRes.json();
        if (!cancelled) setTaskStatus(statusData);

        // 2. Progress over time (new endpoint)
        const progressRes = await fetch(
          `http://localhost:5000/api/projects/${projectId}/analytics/progress-over-time`,
          { headers }
        );
        if (progressRes.ok) {
          const prog = await progressRes.json();
          if (!cancelled) setProgressData(prog);
        }

        // 3. Budget breakdown (new endpoint)
        const budgetRes = await fetch(
          `http://localhost:5000/api/projects/${projectId}/analytics/budget-breakdown`,
          { headers }
        );
        if (budgetRes.ok) {
          const budget = await budgetRes.json();
          if (!cancelled) setBudgetData(budget);
        }

        // 4. On-time rate + reports count (consolidated endpoint — the only
        // one that computes these two figures server-side)
        const summaryRes = await fetch(
          `http://localhost:5000/api/projects/${projectId}/analytics`,
          { headers }
        );
        if (summaryRes.ok) {
          const s = await summaryRes.json();
          if (!cancelled) setSummary(s);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setStatusError("Impossible de charger les données analytiques.");
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [projectId, authToken]);

  // Variance budgétaire réelle du projet (pas seulement le top 6 tâches
  // utilisé pour le graphique Bar) : (dépensé - estimé) / estimé.
  // Négatif = sous le budget, positif = dépassement.
  const budgetVariance = project && Number(project.budget_total) > 0
    ? ((Number(project.budget_spent) - Number(project.budget_total)) / Number(project.budget_total)) * 100
    : null;

  const card = {
    background: '#fff', borderRadius: 24,
    border: `0.5px solid ${C.lighter}`, padding: 24,
  };

  const totalTasks = taskStatus
    ? taskStatus.not_started + taskStatus.in_progress + taskStatus.done
    : 0;

  const donutData = {
    labels: ['Non commencées', 'En cours', 'Terminées'],
    datasets: [{
      data: taskStatus
        ? [taskStatus.not_started, taskStatus.in_progress, taskStatus.done]
        : [0, 0, 0],
      backgroundColor: [C.lighter, C.mid, C.primary],
      borderWidth: 0, hoverOffset: 4,
    }],
  };

  // UPDATED: Use real progress data if available, else fallback
  const lineData = progressData ? {
    labels: progressData.labels,
    datasets: [
      {
        label: 'Actual Progress',
        data: progressData.actual,
        borderColor: C.primary,
        backgroundColor: 'rgba(29,55,200,0.08)',
        fill: true, tension: 0.4, pointRadius: 3,
        pointBackgroundColor: C.primary, borderWidth: 2,
      },
      {
        label: 'Target',
        data: progressData.target,
        borderColor: C.light, borderDash: [5, 4],
        fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.5,
      },
    ],
  } : {
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    datasets: [
      {
        label: 'Actual Progress',
        data: [35, 44, 54, 61, 66, 70],
        borderColor: C.primary,
        backgroundColor: 'rgba(29,55,200,0.08)',
        fill: true, tension: 0.4, pointRadius: 3,
        pointBackgroundColor: C.primary, borderWidth: 2,
      },
      {
        label: 'Target',
        data: [40, 50, 57, 63, 70, 77],
        borderColor: C.light, borderDash: [5, 4],
        fill: false, tension: 0.4, pointRadius: 0, borderWidth: 1.5,
      },
    ],
  };

  const barData = budgetData ? {
    labels: budgetData.labels,
    datasets: [
      { label: 'Estimated', data: budgetData.estimated, backgroundColor: C.primary, borderRadius: 6, barPercentage: 0.45 },
      { label: 'Actual', data: budgetData.actual, backgroundColor: C.light, borderRadius: 6, barPercentage: 0.45 },
    ],
  } : {
    labels: ['Downtown', 'Harbor', 'Riverside', 'Tech'],
    datasets: [
      { label: 'Estimated', data: [1200000, 2800000, 800000, 4500000], backgroundColor: C.primary, borderRadius: 6, barPercentage: 0.45 },
      { label: 'Actual', data: [700000, 1700000, 400000, 3300000], backgroundColor: C.light, borderRadius: 6, barPercentage: 0.45 },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div style={card}>
          <p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>Statut des tâches</p>
          <p style={{ fontSize: 12, color: C.mid, marginBottom: 16 }}>Répartition réelle de ce projet</p>

          {statusLoading ? (
            <p style={{ color: C.mid, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>Chargement…</p>
          ) : statusError ? (
            <p style={{ color: '#b91c1c', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>{statusError}</p>
          ) : totalTasks === 0 ? (
            <p style={{ color: C.mid, fontSize: 13, padding: '24px 0', textAlign: 'center' }}>Aucune tâche pour ce projet.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                <Doughnut data={donutData} options={{
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } } },
                  cutout: '68%', maintainAspectRatio: true,
                }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  [C.lighter, 'Non commencées', taskStatus.not_started],
                  [C.mid, 'En cours', taskStatus.in_progress],
                  [C.primary, 'Terminées', taskStatus.done],
                ].map(([color, label, count]) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.medium }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0, display: 'inline-block' }} />
                    {label}
                    <strong style={{ marginLeft: 'auto', paddingLeft: 12, color: C.dark }}>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={card}>
          <p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>Progress vs. target</p>
          <p style={{ fontSize: 12, color: C.mid, marginBottom: 16 }}>Monthly achievement comparison</p>
          <div style={{ height: 150 }}>
            <Line data={lineData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { ...axis, min: 0, max: 100, ticks: { ...axis.ticks, callback: v => v + '%' } },
                x: { ...axis, grid: { display: false } },
              },
            }} />
          </div>
          <ChartLegend items={[{ color: C.primary, label: 'Actual progress' }, { color: C.lighter, label: 'Target', dashed: true }]} />
        </div>
      </div>

      <div style={card}>
        <p style={{ fontWeight: 700, fontSize: 14, color: C.dark }}>Budget by project</p>
        <p style={{ fontSize: 12, color: C.mid, marginBottom: 16 }}>Estimated vs. actual spend comparison</p>
        <div style={{ height: 220 }}>
          <Bar data={barData} options={{
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatDA(ctx.parsed.y)}` } },
            },
            scales: {
              y: { ...axis, ticks: { ...axis.ticks, callback: v => formatDA(v) } },
              x: { ...axis, grid: { display: false } },
            },
          }} />
        </div>
        <ChartLegend items={[{ color: C.primary, label: 'Estimated' }, { color: C.light, label: 'Actual' }]} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Target}
          label="On-time rate"
          value={summary?.onTimeRate != null ? `${summary.onTimeRate}%` : '—'}
          desc="Tasks meeting deadlines"
        />
        <StatCard
          icon={TrendingDown}
          label="Budget variance"
          value={budgetVariance != null ? `${budgetVariance > 0 ? '+' : ''}${budgetVariance.toFixed(1)}%` : '—'}
          desc={budgetVariance != null ? (budgetVariance <= 0 ? 'Under budget' : 'Over budget') : 'No budget data'}
        />
        <StatCard
          icon={CalendarDays}
          label="Reports generated"
          value={summary?.reportsCount ?? '—'}
          desc="This quarter"
        />
      </div>
    </div>
  );
};

// ── BUDGET TAB ─────────────────────────────────────────────
const BudgetPlaceholder = ({ project }) => {
  const pct = Math.min((project.budget_spent / project.budget_total) * 100, 100).toFixed(1);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div style={{ background: '#fff', borderRadius: 24, border: `0.5px solid ${C.lighter}`, padding: 24 }}>
        <h3 style={{ fontWeight: 700, color: C.dark, marginBottom: 16 }}>Financial summary</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: C.mid }}>Estimated budget</span>
            <span style={{ fontWeight: 600, color: C.dark }}>{Number(project.budget_total).toLocaleString()} DA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: C.mid }}>Actual spent</span>
            <span style={{ fontWeight: 600, color: C.primary }}>{Number(project.budget_spent).toLocaleString()} DA</span>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.medium, marginBottom: 6 }}>
              <span>Budget used</span><span>{pct}%</span>
            </div>
            <div style={{ height: 8, background: C.pale, borderRadius: 8, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                style={{ height: '100%', background: C.primary, borderRadius: 8 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── DOCUMENTS TAB (unchanged, works with new backend) ──────────────────────────
const DOC_CATEGORIES = ['All', 'Contract', 'Blueprint', 'Permit', 'Report', 'Other'];

const categoryStyle = (type) => {
  const map = {
    Contract: { icon: FileCheck, color: '#1d37c8', bg: '#e6f1fb' },
    Blueprint: { icon: Map, color: '#0891b2', bg: '#e0f2fe' },
    Permit: { icon: ClipboardList, color: '#d97706', bg: '#fef3c7' },
    Report: { icon: FileText, color: '#16a34a', bg: '#dcfce7' },
    Other: { icon: FileText, color: '#6b7280', bg: '#f3f4f6' },
  };
  return map[type] || map['Other'];
};

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
};

const DocumentsTab = ({ projectId }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const loadDocs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/documents/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDocs(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('file', file);
      form.append('project_id', projectId);
      const name = file.name.toLowerCase();
      const cat = name.includes('contract') ? 'Contract'
        : name.includes('plan') || name.includes('blueprint') ? 'Blueprint'
          : name.includes('permit') ? 'Permit'
            : name.includes('report') ? 'Report'
              : 'Other';
      form.append('category', cat);
      form.append('name', file.name.replace(/\.[^.]+$/, ''));
      await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      await loadDocs();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const visible = docs.filter(d => {
    const matchCat = activeFilter === 'All' || d.category === activeFilter;
    const matchSearch = d.name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Documents</h3>
          <p style={{ fontSize: 13, color: '#6b7280' }}>Contracts, blueprints, permits, and reports</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.primary, color: '#fff',
            padding: '10px 20px', borderRadius: 12,
            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
            opacity: uploading ? 0.7 : 1,
          }}
        >
          <Upload size={15} />
          {uploading ? 'Uploading…' : 'Upload Document'}
        </button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '11px 16px 11px 40px',
            borderRadius: 12, border: `1px solid ${C.lighter}`,
            fontSize: 13, color: '#111827', background: '#fff',
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = C.mid}
          onBlur={e => e.target.style.borderColor = C.lighter}
        />
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {DOC_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            style={{
              padding: '6px 16px', borderRadius: 999,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: 'none', transition: 'all .15s',
              background: activeFilter === cat ? C.dark : '#e5e7eb',
              color: activeFilter === cat ? '#fff' : '#374151',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: 40 }}>Loading documents…</p>
      ) : visible.length === 0 ? (
        <div style={{
          padding: 56, background: '#fff', borderRadius: 24,
          border: `1px solid ${C.lighter}`, textAlign: 'center',
        }}>
          <FileText size={44} color={C.lighter} style={{ margin: '0 auto 14px' }} />
          <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 500 }}>No documents found.</p>
          <p style={{ color: '#d1d5db', fontSize: 13, marginTop: 4 }}>Upload your first document using the button above.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {visible.map(doc => {
            const { icon: Icon, color, bg } = categoryStyle(doc.category);
            return (
              <div
                key={doc.id}
                style={{
                  background: '#fff', borderRadius: 20,
                  border: `1px solid ${C.lighter}`, padding: 20,
                  display: 'flex', flexDirection: 'column', gap: 12,
                  cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = C.mid;
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(55,138,221,0.10)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = C.lighter;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Icon + menu */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={18} color={color} />
                  </div>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreHorizontal size={16} color="#9ca3af" />
                  </button>
                </div>

                {/* Name + meta */}
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 3 }}>{doc.name}</p>
                  <p style={{ fontSize: 12, color: '#9ca3af' }}>
                    {doc.category}&nbsp;•&nbsp;{formatSize(doc.file_size)}
                  </p>
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: 10, borderTop: `1px solid ${C.pale}`,
                }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{doc.uploaded_by || '—'}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {doc.created_at
                      ? new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── REPORT DETAIL MODAL ─────────────────────────────────────
// Affiche le contenu complet d'un rapport journalier (content + tasks),
// chargé via GET /api/reports/:id au clic sur une carte dans l'onglet
// "Daily reports". Lecture seule.
function ReportDetailModal({ report, loading, error, onClose }) {
  const tasks = Array.isArray(report?.tasks) ? report.tasks : [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(4,44,83,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 24, padding: 28,
          width: '90%', maxWidth: 560, maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>
              {report?.report_date ? `Rapport du ${new Date(report.report_date).toLocaleDateString()}` : 'Rapport'}
            </h3>
            {report?.author_name && (
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>Rédigé par {report.author_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {loading ? (
          <p style={{ color: C.mid, textAlign: 'center', padding: 24 }}>Chargement du rapport…</p>
        ) : error ? (
          <p style={{ color: '#b91c1c', textAlign: 'center', padding: 24 }}>{error}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.medium, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Contenu
              </p>
              <p style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {report?.content?.trim()
                  ? report.content
                  : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Aucun contenu.</span>}
              </p>
            </div>

            {tasks.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.medium, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Tâches concernées ({tasks.length})
                </p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 18, margin: 0 }}>
                  {tasks.map((t, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#374151' }}>
                      {typeof t === 'object' ? (t.name || t.title || JSON.stringify(t)) : String(t)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────
export default function ProjectDetails({ projectId, onBack }) {
  const [activeTab, setActiveTab] = useState('analytics');
  const [project, setProject] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ganttTasks, setGanttTasks] = useState([]);
  const [ganttLoading, setGanttLoading] = useState(false);
  const [ganttError, setGanttError] = useState(null);
  const [taskModal, setTaskModal] = useState({ open: false, mode: 'add', task: null });

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState(null);

  // Rapport ouvert dans la modal de détail (onglet "Daily reports")
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [reportDetailError, setReportDetailError] = useState(null);

  const authToken = localStorage.getItem('token');

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Not found');
        setProject(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) load();
  }, [projectId]);

  useEffect(() => {
    if (activeTab === 'daily-reports' && projectId) {
      fetch(`http://localhost:5000/api/reports/project/${projectId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then(r => r.json()).then(setReports).catch(console.error);
    }
  }, [activeTab, projectId, authToken]);

  // Charge le contenu complet d'un rapport (content + tasks) au clic sur
  // une carte de l'onglet "Daily reports".
  const handleOpenReport = async (reportId) => {
    setSelectedReport({ loading: true }); // ouvre la modal tout de suite, en état "chargement"
    setReportDetailLoading(true);
    setReportDetailError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/reports/${reportId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setSelectedReport(data);
    } catch (e) {
      console.error(e);
      setReportDetailError("Impossible de charger le contenu du rapport.");
    } finally {
      setReportDetailLoading(false);
    }
  };

  //alerts

  useEffect(() => {
    if (activeTab === 'alerts' && projectId) {
      setAlertsLoading(true);
      setAlertsError(null);
      fetch(`http://localhost:5000/api/projects/${projectId}/alerts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then(r => {
          if (!r.ok) throw new Error(`Erreur ${r.status}`);
          return r.json();
        })
        .then(setAlerts)
        .catch(e => {
          console.error(e);
          setAlertsError("Impossible de charger les alertes.");
        })
        .finally(() => setAlertsLoading(false));
    }
  }, [activeTab, projectId, authToken]);
  // UPDATED: Use the enhanced tasks endpoint that returns dependencies and is_delayed
  const loadGanttTasks = useCallback(async () => {
    if (!projectId) return;
    setGanttLoading(true);
    setGanttError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setGanttTasks(await res.json());
    } catch (e) {
      console.error(e);
      setGanttError("Impossible de charger les tâches du planning.");
    } finally {
      setGanttLoading(false);
    }
  }, [projectId, authToken]);

  useEffect(() => {
    if ((activeTab === 'gantt' || activeTab === 'tasks') && projectId) loadGanttTasks();
  }, [activeTab, projectId, loadGanttTasks]);

  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      await loadGanttTasks();
    } catch (e) {
      console.error(e);
      setGanttError("Impossible de supprimer la tâche.");
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.mid }}>
        Loading project…
      </div>
    </div>
  );

  if (!project) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.mid }}>
        Project not found.
      </div>
    </div>
  );

  // Number(...) évite les NaN si l'API renvoie une string pg numeric, et
  // le garde-fou sur budget_total = 0 évite un "NaN%" affiché si le budget
  // n'a pas encore été renseigné pour ce projet.
  const budgetPercent = Number(project.budget_total) > 0
    ? (Number(project.budget_spent) / Number(project.budget_total)) * 100
    : 0;

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'budget', label: 'Budget tracking', icon: Wallet },
    { id: 'tasks', label: 'Tâches', icon: ListTodo },
    { id: 'gantt', label: 'Gantt planning', icon: Layers },
    { id: 'daily-reports', label: 'Daily reports', icon: FileText },
    { id: 'alerts', label: 'AI alerts', icon: AlertTriangle },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      <Sidebar />

      <div style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500, color: C.mid,
            background: 'none', border: 'none', cursor: 'pointer',
            marginBottom: 24,
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.dark}
          onMouseLeave={e => e.currentTarget.style.color = C.mid}
        >
          <ArrowLeft size={16} /> Back to projects list
        </button>

        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{project.name}</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>{project.description}</p>
          </div>
          <span style={{
            padding: '5px 14px', borderRadius: 999,
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
            background: C.pale, color: C.primary, border: `1px solid ${C.lighter}`,
            whiteSpace: 'nowrap', marginTop: 4,
          }}>
            {project.status}
          </span>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180, background: '#fff', borderRadius: 20, border: `1px solid ${C.lighter}`, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.pale, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={20} color={C.primary} />
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Start date</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{new Date(project.start_date).toLocaleDateString()}</p>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 180, background: '#fff', borderRadius: 20, border: `1px solid ${C.lighter}`, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.pale, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={20} color={C.primary} />
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Manager</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{project.owner_name}</p>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 180, background: '#fff', borderRadius: 20, border: `1px solid ${C.lighter}`, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.pale, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={20} color={C.primary} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Progress</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{Number(project.progress) || 0}% complete</p>
              <div style={{ height: 4, background: C.lighter, borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
                <div style={{ width: `${Math.min(Number(project.progress) || 0, 100)}%`, height: '100%', background: C.primary, borderRadius: 4 }} />
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200, background: C.pale, borderRadius: 20, border: `1px solid ${C.lighter}`, padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.medium, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Budget used</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>{budgetPercent.toFixed(1)}%</span>
            </div>
            <div style={{ height: 6, background: C.lighter, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${Math.min(budgetPercent, 100)}%` }}
                style={{ height: '100%', background: C.primary, borderRadius: 6 }}
              />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>
              {formatDA(project.budget_spent)}
              <span style={{ fontSize: 13, color: C.light, fontWeight: 400, marginLeft: 6 }}>
                / {formatDA(project.budget_total)}
              </span>
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 4,
          padding: 4, background: '#e5e7eb',
          borderRadius: 16, width: 'fit-content', marginBottom: 24,
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 12,
                fontSize: 13, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: activeTab === tab.id ? C.primary : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#6b7280',
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          {activeTab === 'analytics' && <AnalyticsTab projectId={projectId} authToken={authToken} project={project} />}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              <BudgetPlaceholder project={project} />
              <EVMCard projectId={projectId} />
            </div>
          )}
          {activeTab === 'tasks' && (
            <div>
              {ganttLoading && ganttTasks.length === 0 ? (
                <p style={{ color: C.mid, textAlign: 'center', padding: 24 }}>Chargement des tâches…</p>
              ) : ganttError ? (
                <p style={{ color: '#b91c1c', textAlign: 'center', padding: 24 }}>{ganttError}</p>
              ) : (
                <TaskTable
                  tasks={ganttTasks}
                  onAdd={() => setTaskModal({ open: true, mode: 'add', task: null })}
                  onEdit={(task) => setTaskModal({ open: true, mode: 'edit', task })}
                  onDelete={handleDeleteTask}
                />
              )}
            </div>
          )}
          {activeTab === 'gantt' && (
            <div style={{ background: '#fff', padding: 28, borderRadius: 24, border: `0.5px solid ${C.lighter}` }}>
              {ganttLoading && ganttTasks.length === 0 ? (
                <p style={{ color: C.mid, textAlign: 'center', padding: 24 }}>Chargement du planning…</p>
              ) : ganttError ? (
                <p style={{ color: '#b91c1c', textAlign: 'center', padding: 24 }}>{ganttError}</p>
              ) : ganttTasks.length === 0 ? (
                <p style={{ color: C.mid, textAlign: 'center', padding: 24 }}>Aucune tâche pour ce projet.</p>
              ) : (
                <GanttChart
                  tasks={ganttTasks}
                  projectId={projectId}
                  authToken={authToken}
                  onUpdate={loadGanttTasks}
                  onTaskClick={() => { }}
                />
              )}
            </div>
          )}

          {activeTab === 'daily-reports' && (
            <div className="space-y-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Rapports de chantier</h3>
                <button
                  onClick={() => navigate('/reports')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: C.primary, color: '#fff',
                    padding: '10px 18px', borderRadius: 12,
                    fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                  }}>
                  <Plus size={15} /> New report
                </button>
              </div>

              {reports.length > 0 ? (
                <div className="grid gap-3">
                  {reports.map(r => (
                    <div
                      key={r.id}
                      onClick={() => handleOpenReport(r.id)}
                      style={{
                        background: '#fff', padding: 20, borderRadius: 20,
                        border: `1px solid ${C.lighter}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', transition: 'border-color .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = C.mid}
                      onMouseLeave={e => e.currentTarget.style.borderColor = C.lighter}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 42, height: 42, background: C.pale, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={18} color={C.primary} />
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>Rapport du {new Date(r.report_date).toLocaleDateString()}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af' }}>Rédigé par {r.author_name}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} color="#d1d5db" />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 56, background: '#fff', borderRadius: 24, border: `1px solid ${C.lighter}`, textAlign: 'center' }}>
                  <FileText size={44} color={C.lighter} style={{ margin: '0 auto 14px' }} />
                  <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 14 }}>Aucun rapport soumis pour ce projet.</p>
                </div>
              )}
            </div>
          )}


          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {alertsLoading ? (
                <p style={{ color: C.mid, textAlign: 'center', padding: 24 }}>Chargement des alertes…</p>
              ) : alertsError ? (
                <p style={{ color: '#b91c1c', textAlign: 'center', padding: 24 }}>{alertsError}</p>
              ) : alerts.length === 0 ? (
                <div style={{ padding: 56, background: '#fff', borderRadius: 24, border: `1px solid ${C.lighter}`, textAlign: 'center' }}>
                  <AlertTriangle size={44} color={C.lighter} style={{ margin: '0 auto 14px' }} />
                  <p style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 14 }}>Aucune alerte active pour ce projet.</p>
                </div>
              ) : (
                alerts.map(a => {
                  const isCritical = a.severity === 'critical';
                  return (
                    <div
                      key={a.id}
                      style={{
                        background: isCritical ? '#fff1f0' : '#fffbeb',
                        border: `1px solid ${isCritical ? '#fca5a5' : '#fcd34d'}`,
                        padding: 24, borderRadius: 20,
                        display: 'flex', alignItems: 'flex-start', gap: 16,
                        color: isCritical ? '#b91c1c' : '#92400e',
                      }}
                    >
                      <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                          <h4 style={{ fontWeight: 700 }}>
                            {a.indicator === 'IPC' ? 'Dépassement de coûts (IPC)' : 'Retard de planning (IPD)'}
                          </h4>
                          <span style={{ fontSize: 11, opacity: 0.7, whiteSpace: 'nowrap' }}>
                            {new Date(a.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, opacity: 0.85 }}>{a.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'documents' && <DocumentsTab projectId={projectId} />}
        </motion.div>
        <TaskModal
          open={taskModal.open}
          mode={taskModal.mode}
          projectId={projectId}
          task={taskModal.task}
          tasks={ganttTasks}
          onClose={() => setTaskModal({ open: false, mode: 'add', task: null })}
          onSaved={loadGanttTasks}
        />

        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            loading={reportDetailLoading}
            error={reportDetailError}
            onClose={() => setSelectedReport(null)}
          />
        )}
      </div>
    </div>
  );
}