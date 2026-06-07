import React, { useState, useEffect } from "react";

const GanttChart = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState(null); // for debugging

  useEffect(() => {
    const fetchGanttData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/dashboard/gantt/${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        // ── DEBUG: log exactly what the API returns
        console.log("🔍 RAW GANTT DATA:", JSON.stringify(data, null, 2));
        setRawData(data);

        const arr = Array.isArray(data) ? data : [data];

        // ── NORMALIZE: handle any field name the API might use
        const normalized = arr.map(t => ({
          id:         t.id         ?? t._id        ?? Math.random(),
          name:       t.name       ?? t.task_name  ?? t.title      ?? t.label ?? 'Unnamed task',
          progress:   t.progress   ?? t.completion ?? t.percent    ?? 0,
          start_date: t.start_date ?? t.startDate  ?? t.start      ?? t.date_debut ?? null,
          end_date:   t.end_date   ?? t.endDate    ?? t.end        ?? t.date_fin   ?? null,
          status:     t.status     ?? null,
        }));

        console.log("✅ NORMALIZED TASKS:", normalized);
        setTasks(normalized);
      } catch (error) {
        console.error("Erreur Gantt:", error);
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchGanttData();
  }, [projectId]);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#378add' }}>
      Chargement du diagramme…
    </div>
  );

  // ── FILTER VALID TASKS ──────────────────────────────────
  const validTasks = tasks.filter(t => {
    const s = new Date(t.start_date);
    const e = new Date(t.end_date);
    const valid = !isNaN(s.getTime()) && !isNaN(e.getTime());
    if (!valid) console.warn("⚠️ Invalid date for task:", t);
    return valid;
  });

  // ── DEBUG VIEW: show raw data in UI so you can see it
  if (validTasks.length === 0) return (
    <div style={{ padding: 24, background: '#fff', borderRadius: 16, border: '1px solid #b5d4f4' }}>
      <p style={{ fontWeight: 700, color: '#b91c1c', marginBottom: 12 }}>
        ⚠️ Dates invalides — voici les données brutes reçues de l'API :
      </p>
      <pre style={{
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: 8, padding: 16,
        fontSize: 12, color: '#334155',
        overflowX: 'auto', maxHeight: 300,
        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
      }}>
        {JSON.stringify(rawData, null, 2)}
      </pre>
      <p style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
        Vérifiez les noms des champs de date dans votre API (ex: <code>start_date</code>, <code>startDate</code>, <code>date_debut</code>…)
      </p>
    </div>
  );

  // ── BUILD MONTH RANGE ───────────────────────────────────
  const allDates   = validTasks.flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
  const minDate    = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate    = new Date(Math.max(...allDates.map(d => d.getTime())));
  const viewStart  = new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1);
  const viewEnd    = new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 1);
  const totalDays  = (viewEnd - viewStart) / 864e5;

  const months = [];
  const cursor = new Date(viewStart);
  while (cursor < viewEnd) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const getPct      = (date) => Math.max(0, Math.min(100, ((new Date(date) - viewStart) / 864e5 / totalDays) * 100));
  const getWidthPct = (s, e)  => Math.max(1,  ((Math.min(new Date(e), viewEnd) - Math.max(new Date(s), viewStart)) / 864e5 / totalDays) * 100);
  const formatDate  = (d)     => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const formatMonth = (d)     => d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });

  const getBarStyle = (p) => {
    if (p >= 100) return { background: '#86efac', border: '1px solid #4ade80' };
    if (p > 0)    return { background: '#93c5fd', border: '1px solid #60a5fa' };
    return               { background: '#94a3b8', border: '1px solid #64748b' };
  };

  const legend = [
    { label: 'Completed',   bg: '#86efac', border: '#4ade80' },
    { label: 'In Progress', bg: '#93c5fd', border: '#60a5fa' },
    { label: 'Pending',     bg: '#94a3b8', border: '#64748b' },
    { label: 'Delayed',     bg: '#fca5a5', border: '#f87171' },
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '0.5px solid #b5d4f4', padding: '24px 28px', overflowX: 'auto' }}>

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Project Timeline</h3>
        <p style={{ fontSize: 13, color: '#6b7280' }}>Gantt chart view of project milestones</p>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {legend.map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.bg, border: `1.5px solid ${l.border}`, display: 'inline-block' }} />
            {l.label}
          </span>
        ))}
      </div>

      <div style={{ minWidth: 700 }}>
        {/* Month headers */}
        <div style={{ display: 'flex', marginBottom: 8, paddingLeft: 220 }}>
          {months.map((m, i) => (
            <div key={i} style={{ width: `${100 / months.length}%`, fontSize: 11, fontWeight: 600, color: '#6b7280', textAlign: 'center', flexShrink: 0 }}>
              {formatMonth(m)}
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: '#e5e7eb', marginBottom: 12 }} />

        {/* Rows */}
        {validTasks.map((task, i) => {
          const p         = task.progress ?? 0;
          const leftPct   = getPct(task.start_date);
          const widthPct  = getWidthPct(task.start_date, task.end_date);
          const barStyle  = getBarStyle(p);

          return (
            <div key={task.id ?? i} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
              
              {/* Name */}
              <div style={{ width: 220, flexShrink: 0, paddingRight: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.name}
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af' }}>{p}% complete</p>
              </div>

              {/* Bar */}
              <div style={{ flex: 1, position: 'relative', height: 36 }}>
                {months.map((_, mi) => (
                  <div key={mi} style={{ position: 'absolute', left: `${(mi / months.length) * 100}%`, top: 0, bottom: 0, width: 1, background: '#f3f4f6' }} />
                ))}
                <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 0, right: 0, height: 1, background: '#e5e7eb' }} />
                <div
                  style={{
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    left: `${leftPct}%`, width: `${widthPct}%`,
                    height: 28, borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#374151',
                    overflow: 'hidden', cursor: 'default',
                    ...barStyle,
                  }}
                  title={`${task.name}: ${formatDate(task.start_date)} → ${formatDate(task.end_date)}`}
                >
                  {p >= 100 ? '✓' : `${p}%`}
                </div>
              </div>

              {/* Date range */}
              <div style={{ width: 120, flexShrink: 0, paddingLeft: 12, fontSize: 11, color: '#6b7280', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {formatDate(task.start_date)} – {formatDate(task.end_date)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GanttChart;