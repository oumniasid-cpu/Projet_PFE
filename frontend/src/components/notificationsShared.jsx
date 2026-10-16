import React, { useState, useEffect } from 'react';

// Same base URL you already use in ProjectDetails.jsx
export const API_BASE = 'http://localhost:5000';

export const C = {
  primary: '#1d37c8', mid: '#378add', light: '#85b7eb', lighter: '#b5d4f4',
  pale: '#e6f1fb', dark: '#042c53', deep: '#0c447c', medium: '#185fa5',
};

export const token = () => localStorage.getItem('token');

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}/api/notifications${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
}

// Priority is always shown as text too, never by colour alone.
export const PRIORITY = {
  critical: { label: 'Critique', color: '#b91c1c', bg: '#fff1f0' },
  high: { label: 'Haute', color: '#92400e', bg: '#fffbeb' },
  normal: { label: 'Normale', color: C.primary, bg: C.pale },
  low: { label: 'Basse', color: '#4b5563', bg: '#f3f4f6' },
};
export const ROLE_LABEL = { chef_projet: 'Chef de projet', ingenieur: 'Ingénieur' };

const chip = { fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, whiteSpace: 'nowrap' };
export const PriorityChip = ({ priority }) => {
  const p = PRIORITY[priority] || PRIORITY.normal;
  return <span style={{ ...chip, color: p.color, background: p.bg }}>{p.label}</span>;
};
export const RoleChip = ({ role }) => (
  <span style={{ ...chip, color: C.medium, background: '#fff', border: `1px solid ${C.lighter}` }}>
    {ROLE_LABEL[role] || role}
  </span>
);

export function timeAgo(d) {
  const s = Math.max(1, Math.round((Date.now() - new Date(d)) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `il y a ${Math.floor(s / 86400)} j`;
  return new Date(d).toLocaleDateString('fr-FR');
}
export const fullDate = (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export function useIsMobile(bp = 768) {
  const q = `(max-width:${bp}px)`;
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const h = (e) => setM(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [q]);
  return m;
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}