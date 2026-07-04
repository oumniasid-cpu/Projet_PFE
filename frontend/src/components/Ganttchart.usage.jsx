/**
 * GanttChart — usage example
 * ──────────────────────────
 * Copy the relevant parts into your existing ProjectDetail.jsx
 * DO NOT replace your existing file — only add what is missing.
 */

import { useState, useEffect } from "react";
import GanttChart from "./GanttChart";

// ─── Minimal ProjectDetail integration example ─────────────────────────────

export default function ProjectDetailExample() {
  const projectId = 1; // replace with useParams() from react-router
  const authToken = localStorage.getItem("token"); // or however you store it

  const [tasks,   setTasks]   = useState([]);
  const [activeTab, setActiveTab] = useState("table"); // "table" | "gantt"
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      setTasks(data.tasks || data); // adapt to your API response shape
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [projectId]);

  return (
    <div style={{ padding: "1.5rem" }}>

      {/* ── Tab bar ── */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        marginBottom: 24,
      }}>
        {[
          { key: "table", label: "Tableau des tâches" },
          { key: "gantt", label: "Diagramme de Gantt" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 20px",
              fontSize: 14,
              border: "none",
              borderBottom: activeTab === tab.key
                ? "2px solid var(--color-border-info)"
                : "2px solid transparent",
              background: "transparent",
              color: activeTab === tab.key
                ? "var(--color-text-info)"
                : "var(--color-text-secondary)",
              fontWeight: activeTab === tab.key ? 500 : 400,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Table tab (your existing TaskTable component) ── */}
      {activeTab === "table" && (
        <div>
          {/* <TaskTable tasks={tasks} onEdit={...} onDelete={...} onAdd={...} /> */}
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
            Your existing TaskTable component goes here.
          </p>
        </div>
      )}

      {/* ── Gantt tab ── */}
      {activeTab === "gantt" && (
        <GanttChart
          tasks={tasks}
          projectId={projectId}
          authToken={authToken}
          onTaskClick={(taskId) => {
            // open your TaskModal in edit mode
            console.log("Open edit modal for task", taskId);
          }}
          onUpdate={() => {
            // refresh tasks + KPI summary after drag
            fetchTasks();
            // also call your fetchSummary() if you have one
          }}
        />
      )}
    </div>
  );
}


/**
 * ─── Task shape expected by GanttChart ────────────────────────────────────
 *
 * Your GET /api/projects/:id/tasks endpoint must return tasks in this shape:
 *
 * [
 *   {
 *     id:               1,
 *     wbs_code:         "1.1",
 *     name:             "Fondations",
 *     planned_start:    "2024-03-01",   // YYYY-MM-DD string
 *     planned_end:      "2024-03-15",   // YYYY-MM-DD string
 *     progress_percent: 75,             // number 0-100
 *     dependencies:     "2,3",          // comma-separated task IDs or ""
 *     is_delayed:       false,          // boolean
 *     status:           "in_progress",  // "not_started"|"in_progress"|"done"|"delayed"
 *   },
 *   ...
 * ]
 *
 * ─── PATCH endpoint expected ───────────────────────────────────────────────
 *
 * PATCH /api/tasks/:task_id
 * Body: { progress_percent: 80 }         ← when user drags progress bar
 *   or: { planned_start, planned_end }   ← when user drags task bar dates
 * Returns: { success: true, task: { ...updatedFields } }
 */