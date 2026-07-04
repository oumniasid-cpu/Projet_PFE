import { useEffect, useRef, useState, useCallback } from "react";

/**
 * GanttChart.jsx
 * ──────────────
 * Renders a Gantt diagram for a project using frappe-gantt.
 * Loads the library dynamically from CDN (no npm install needed).
 *
 * Props:
 *   tasks        — array from GET /api/projects/:id/tasks
 *   projectId    — string | number, used for PATCH API calls
 *   onTaskClick  — (taskId) => void  — opens TaskModal in edit mode
 *   onUpdate     — () => void        — called after any PATCH so parent refreshes KPIs
 *   authToken    — string            — Bearer token for API calls
 *
 * Task shape expected (from your API):
 *   { id, wbs_code, name, planned_start, planned_end, progress_percent,
 *     dependencies, is_delayed, status }
 */

const VIEW_MODES = [
  { label: "Jour",    value: "Day"   },
  { label: "Semaine", value: "Week"  },
  { label: "Mois",    value: "Month" },
  { label: "Année",   value: "Year"  },
];

const STATUS_COLORS = {
  done:        "#3B6D11",
  in_progress: "#185FA5",
  delayed:     "#A32D2D",
  not_started: "#5F5E5A",
};

const FRAPPE_CDN_JS  = "https://cdn.jsdelivr.net/npm/frappe-gantt/dist/frappe-gantt.umd.js";
const FRAPPE_CDN_CSS = "https://cdn.jsdelivr.net/npm/frappe-gantt/dist/frappe-gantt.css";

// ─── helpers ───────────────────────────────────────────────────────────────

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

function toFrappeTask(t) {
  return {
    id:           String(t.id),
    name:         (t.wbs_code ? `${t.wbs_code} ` : "") + t.name,
    start:        t.planned_start,
    end:          t.planned_end,
    progress:     Math.round(Number(t.progress_percent) || 0),
    dependencies: t.dependencies || "",
    custom_class: t.is_delayed ? "bar-delayed" : getStatusClass(t.status),
  };
}

function getStatusClass(status) {
  const map = {
    done:        "bar-done",
    in_progress: "bar-in-progress",
    not_started: "bar-not-started",
  };
  return map[status] || "";
}

async function patchTask(projectId, taskId, payload, authToken) {
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── component ─────────────────────────────────────────────────────────────

export default function GanttChart({
  tasks = [],
  projectId,
  onTaskClick,
  onUpdate,
  authToken,
}) {
  const svgRef      = useRef(null);
  const ganttRef    = useRef(null);
  const [viewMode, setViewMode]   = useState("Week");
  const [libReady, setLibReady]   = useState(false);
  const [error, setError]         = useState(null);
  const [patchError, setPatchError] = useState(null);
  const [patchLoading, setPatchLoading] = useState(false);

  // Load frappe-gantt once
  useEffect(() => {
    loadCSS(FRAPPE_CDN_CSS);
    loadScript(FRAPPE_CDN_JS)
      .then(() => setLibReady(true))
      .catch(() => setError("Impossible de charger la bibliothèque Gantt. Vérifiez votre connexion."));
  }, []);

  // Inject custom bar styles
  useEffect(() => {
    const id = "gantt-custom-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .gantt .bar-wrapper.bar-delayed .bar-progress { fill: #E24B4A; }
      .gantt .bar-wrapper.bar-delayed .bar { fill: #FCEBEB; stroke: #E24B4A; }
      .gantt .bar-wrapper.bar-done .bar-progress { fill: #3B6D11; }
      .gantt .bar-wrapper.bar-done .bar { fill: #EAF3DE; stroke: #3B6D11; }
      .gantt .bar-wrapper.bar-in-progress .bar-progress { fill: #185FA5; }
      .gantt .bar-wrapper.bar-in-progress .bar { fill: #E6F1FB; stroke: #185FA5; }
      .gantt .bar-wrapper.bar-not-started .bar-progress { fill: #888780; }
      .gantt .bar-wrapper.bar-not-started .bar { fill: #F1EFE8; stroke: #888780; }
      .gantt .bar-label { font-size: 11px; font-family: inherit; }
      .gantt .today-highlight { fill: #FAEEDA; opacity: 0.35; }
      .gantt-container { font-family: inherit; }
    `;
    document.head.appendChild(style);
  }, []);

  // Build / rebuild Gantt when tasks or viewMode change
  const buildGantt = useCallback(() => {
    if (!libReady || !svgRef.current || !window.Gantt) return;
    if (!tasks.length) return;

    const frappeTasks = tasks.map(toFrappeTask);

    try {
      ganttRef.current = new window.Gantt(svgRef.current, frappeTasks, {
        view_mode:   viewMode,
        date_format: "YYYY-MM-DD",
        language:    "fr",

        on_click: (task) => {
          if (onTaskClick) onTaskClick(Number(task.id));
        },

        on_progress_change: async (task, progress) => {
          if (!projectId) return;
          setPatchLoading(true);
          setPatchError(null);
          try {
            await patchTask(projectId, task.id, { progress_percent: Math.round(progress) }, authToken);
            if (onUpdate) onUpdate();
          } catch (e) {
            setPatchError(`Erreur lors de la mise à jour de l'avancement : ${e.message}`);
          } finally {
            setPatchLoading(false);
          }
        },

        on_date_change: async (task, start, end) => {
          if (!projectId) return;
          const fmt = (d) => d.toISOString().split("T")[0];
          setPatchLoading(true);
          setPatchError(null);
          try {
            await patchTask(projectId, task.id, {
              planned_start: fmt(start),
              planned_end:   fmt(end),
            }, authToken);
            if (onUpdate) onUpdate();
          } catch (e) {
            setPatchError(`Erreur lors de la mise à jour des dates : ${e.message}`);
          } finally {
            setPatchLoading(false);
          }
        },
      });
    } catch (e) {
      setError(`Erreur d'initialisation du diagramme : ${e.message}`);
    }
  }, [libReady, tasks, viewMode, projectId, authToken, onTaskClick, onUpdate]);

  useEffect(() => {
    buildGantt();
  }, [buildGantt]);

  // Change view mode on existing instance if possible
  const handleViewMode = (mode) => {
    setViewMode(mode);
    if (ganttRef.current && ganttRef.current.change_view_mode) {
      try {
        ganttRef.current.change_view_mode(mode);
      } catch {
        // rebuilds via useEffect
      }
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={{
        padding: "2rem",
        textAlign: "center",
        color: "var(--color-text-danger)",
        background: "var(--color-background-danger)",
        borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-danger)",
        fontSize: 14,
      }}>
        <i className="ti ti-alert-circle" style={{ fontSize: 24, display: "block", marginBottom: 8 }} aria-hidden="true" />
        {error}
      </div>
    );
  }

  if (!libReady) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
        <i className="ti ti-loader" style={{ fontSize: 20, marginRight: 8, display: "inline-block" }} aria-hidden="true" />
        Chargement du diagramme…
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div style={{
        padding: "3rem 2rem",
        textAlign: "center",
        color: "var(--color-text-secondary)",
        fontSize: 14,
        border: "0.5px dashed var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
      }}>
        <i className="ti ti-calendar-off" style={{ fontSize: 32, display: "block", marginBottom: 12, opacity: 0.4 }} aria-hidden="true" />
        Aucune tâche à afficher dans le diagramme.
        <br />
        <span style={{ fontSize: 13 }}>Ajoutez des tâches depuis l'onglet "Tableau des tâches".</span>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>

      {/* toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        flexWrap: "wrap",
        gap: 12,
      }}>

        {/* view mode toggle */}
        <div style={{
          display: "flex",
          gap: 0,
          border: "0.5px solid var(--color-border-secondary)",
          borderRadius: "var(--border-radius-md)",
          overflow: "hidden",
        }}>
          {VIEW_MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => handleViewMode(m.value)}
              style={{
                padding: "5px 14px",
                fontSize: 13,
                border: "none",
                borderRight: "0.5px solid var(--color-border-tertiary)",
                cursor: "pointer",
                background: viewMode === m.value
                  ? "var(--color-background-info)"
                  : "var(--color-background-primary)",
                color: viewMode === m.value
                  ? "var(--color-text-info)"
                  : "var(--color-text-secondary)",
                fontWeight: viewMode === m.value ? 500 : 400,
                transition: "background 0.15s",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* patch status */}
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
          {patchLoading && (
            <>
              <i className="ti ti-loader" style={{ fontSize: 14 }} aria-hidden="true" />
              Enregistrement…
            </>
          )}
          {patchError && !patchLoading && (
            <span style={{ color: "var(--color-text-danger)" }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 14, marginRight: 4 }} aria-hidden="true" />
              {patchError}
            </span>
          )}
        </div>
      </div>

      {/* hint */}
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 12, marginTop: 0 }}>
        Glissez une barre pour modifier les dates · Glissez le coin droit de la progression pour mettre à jour l'avancement · Cliquez sur une barre pour modifier la tâche.
      </p>

      {/* chart */}
      <div style={{ overflowX: "auto", width: "100%", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)" }}>
        <svg ref={svgRef} id="gantt-svg" />
      </div>

      {/* legend */}
      <div style={{
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        marginTop: 16,
        paddingTop: 12,
        borderTop: "0.5px solid var(--color-border-tertiary)",
      }}>
        {[
          { color: STATUS_COLORS.in_progress, label: "En cours"      },
          { color: STATUS_COLORS.done,        label: "Terminée"      },
          { color: STATUS_COLORS.delayed,     label: "En retard"     },
          { color: STATUS_COLORS.not_started, label: "Non démarrée" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
            <span style={{
              width: 10, height: 10,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
            }} />
            {label}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)", marginLeft: "auto" }}>
          <span style={{ width: 10, height: 10, background: "#EF9F27", opacity: 0.4, flexShrink: 0, borderRadius: 2 }} />
          Aujourd'hui
        </div>
      </div>
    </div>
  );
}