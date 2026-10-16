import React, { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, Settings, Check, Archive, ArchiveRestore, Mail, MailOpen, X } from 'lucide-react';
import Sidebar from '../components/SideBar';
import {
  API_BASE, C, api, token, timeAgo, fullDate, useIsMobile, useDebounced, PriorityChip, RoleChip,
} from '../components/notificationsShared';

const TABS = [
  { id: 'inbox', label: 'Boîte de réception' },
  { id: 'unread', label: 'Non lues' },
  { id: 'archived', label: 'Archivées' },
  { id: 'audit', label: "Journal d'audit" },
];
const EMPTY_FILTERS = { project_id: '', role: '', priority: '', from: '', to: '' };

const field = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, border: `1px solid ${C.lighter}`, fontSize: 13, background: '#fff', color: '#111827' };
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: C.medium, marginBottom: 4 };
const btn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${C.lighter}`, background: '#fff', color: C.primary };
const btnPrimary = { ...btn, background: C.primary, color: '#fff', border: 'none' };

// ── One row ────────────────────────────────────────────────
function Row({ n, audit, onAct }) {
  const unread = !audit && !n.read_at;
  const stripe = { critical: '#b91c1c', high: '#d97706', normal: C.primary, low: '#9ca3af' }[n.priority] || C.primary;
  return (
    <li style={{ listStyle: 'none', background: unread ? '#f5f9ff' : '#fff', border: `1px solid ${C.lighter}`, borderLeft: `4px solid ${stripe}`, borderRadius: 16, padding: '14px 16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {unread && <span role="img" aria-label="Non lue" style={{ width: 8, height: 8, borderRadius: 99, background: C.primary }} />}
        <strong style={{ fontSize: 14, color: C.dark }}>{n.actor_name}</strong>
        <RoleChip role={n.actor_role} />
        <PriorityChip priority={n.priority} />
        <time dateTime={n.created_at} title={fullDate(n.created_at)} style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>
          {timeAgo(n.created_at)}
        </time>
      </div>
      <p style={{ fontSize: 12, color: C.medium, margin: '6px 0 2px' }}>
        {[n.project_name, n.task_name].filter(Boolean).join(' › ') || 'Projet supprimé'}
      </p>
      <p style={{ fontSize: 14, color: '#374151', margin: 0, fontWeight: unread ? 600 : 400, lineHeight: 1.5 }}>{n.summary}</p>
      {!audit && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button style={btn} onClick={() => onAct(n, { read: !n.read_at })}>
            {n.read_at ? <Mail size={13} /> : <MailOpen size={13} />}
            {n.read_at ? 'Marquer non lue' : 'Marquer comme lue'}
          </button>
          <button style={btn} onClick={() => onAct(n, { archived: !n.archived_at })}>
            {n.archived_at ? <ArchiveRestore size={13} /> : <Archive size={13} />}
            {n.archived_at ? 'Restaurer' : 'Archiver'}
          </button>
        </div>
      )}
    </li>
  );
}

// ── Preferences ────────────────────────────────────────────
function PreferencesModal({ onClose, mobile }) {
  const [p, setP] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

 

  const set = (k, v) => setP((prev) => ({ ...prev, [k]: v }));
 

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(4,44,83,0.35)', zIndex: 80, display: 'flex', alignItems: mobile ? 'flex-end' : 'center', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="prefs-title" onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 24, borderRadius: mobile ? '24px 24px 0 0' : 24 }}>
       

        {!p ? <p style={{ color: C.mid }}>{msg || 'Chargement…'}</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', gap: 10, fontSize: 14 }}>
              <input type="checkbox" checked={p.in_app_enabled} onChange={(e) => set('in_app_enabled', e.target.checked)} />
              <span>Alertes en direct dans l'application<br /><small style={{ color: '#6b7280' }}>Le fil et le journal restent toujours consultables.</small></span>
            </label>
            <label style={{ display: 'flex', gap: 10, fontSize: 14 }}>
              <input type="checkbox" checked={p.email_enabled} onChange={(e) => set('email_enabled', e.target.checked)} />
              <span>Recevoir aussi par e-mail</span>
            </label>

            <div>
              <label htmlFor="freq" style={label}>Fréquence des e-mails</label>
              <select id="freq" style={field} value={p.frequency} disabled={!p.email_enabled} onChange={(e) => set('frequency', e.target.value)}>
                <option value="instant">Immédiate</option>
                <option value="hourly">Résumé toutes les heures</option>
                <option value="daily">Résumé quotidien</option>
              </select>
            </div>

            <div>
              <label htmlFor="minp" style={label}>Alerter à partir de la priorité</label>
              <select id="minp" style={field} value={p.min_priority} onChange={(e) => set('min_priority', e.target.value)}>
                <option value="low">Toutes</option><option value="normal">Normale et plus</option>
                <option value="high">Haute et plus</option><option value="critical">Critique uniquement</option>
              </select>
            </div>

            <fieldset style={{ border: `1px solid ${C.lighter}`, borderRadius: 12, padding: 12 }}>
              <legend style={{ ...label, padding: '0 6px' }}>Heures calmes (aucune alerte ni e-mail)</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label htmlFor="qs" style={label}>De</label>
                  <input id="qs" type="time" style={field} value={(p.quiet_start || '').slice(0, 5)} onChange={(e) => set('quiet_start', e.target.value)} /></div>
                <div><label htmlFor="qe" style={label}>À</label>
                  <input id="qe" type="time" style={field} value={(p.quiet_end || '').slice(0, 5)} onChange={(e) => set('quiet_end', e.target.value)} /></div>
              </div>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '8px 0 0' }}>
                Laissez vide pour désactiver. Les e-mails retenus partent à la fin de la période.
              </p>
            </fieldset>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              {msg && <span role="status" style={{ fontSize: 12, color: C.medium }}>{msg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────
export default function NotificationsPage() {
  const mobile = useIsMobile();
  const [tab, setTab] = useState('inbox');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [projects, setProjects] = useState([]);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const audit = tab === 'audit';
  const activeCount = Object.values(filters).filter(Boolean).length;

  useEffect(() => {
    fetch(`${API_BASE}/api/projects`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : d.projects || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async (beforeId) => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ limit: 20 });
      Object.entries({ ...filters, q: dq }).forEach(([k, v]) => v && p.set(k, v));
      if (!audit) p.set('status', tab);
      if (beforeId) p.set('before', beforeId);
      const data = await api(`${audit ? '/audit' : ''}?${p}`);
      setItems((prev) => (beforeId ? [...prev, ...data.items] : data.items));
      setHasMore(data.items.length === 20);
    } catch {
      setError('Impossible de charger les notifications. Vérifiez votre connexion et réessayez.');
    } finally { setLoading(false); }
  }, [tab, audit, filters, dq]);

  useEffect(() => { load(); }, [load]);

  // New update arrives while the page is open -> refresh the first page.
  useEffect(() => {
    const h = () => load();
    window.addEventListener('notifications:new', h);
    return () => window.removeEventListener('notifications:new', h);
  }, [load]);

  const act = async (n, patch) => {
    try {
      const upd = await api(`/${n.id}`, { method: 'PATCH', body: patch });
      setItems((prev) => prev.flatMap((x) => {
        if (x.id !== n.id) return [x];
        const m = { ...x, ...upd };
        const gone = (tab === 'archived' && !m.archived_at) || (tab !== 'archived' && m.archived_at) || (tab === 'unread' && m.read_at);
        return gone ? [] : [m];
      }));
      window.dispatchEvent(new Event('notifications:changed'));
    } catch { setError("L'action a échoué. Réessayez."); }
  };

  const markAll = async () => {
    try { await api('/mark-all-read', { method: 'POST' }); window.dispatchEvent(new Event('notifications:changed')); load(); }
    catch { setError("L'action a échoué. Réessayez."); }
  };

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, padding: mobile ? '20px 14px' : '36px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: mobile ? 22 : 26, fontWeight: 700, color: '#111827', margin: 0 }}>Notifications</h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>Mises à jour des chefs de projet et ingénieurs.</p>
          </div>
            </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Type de notifications" style={{ display: 'flex', gap: 4, padding: 4, background: '#e5e7eb', borderRadius: 16, overflowX: 'auto', marginBottom: 16, width: mobile ? '100%' : 'fit-content', boxSizing: 'border-box' }}>
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              style={{ padding: '9px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', background: tab === t.id ? C.primary : 'transparent', color: tab === t.id ? '#fff' : '#4b5563' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} color="#6b7280" aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input type="search" aria-label="Rechercher une mise à jour" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher par mot-clé, projet, tâche ou personne"
              style={{ ...field, padding: '11px 14px 11px 40px' }} />
          </div>
          {mobile && (
            <button style={btn} onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
              <SlidersHorizontal size={14} /> Filtres{activeCount ? ` (${activeCount})` : ''}
            </button>
          )}
        </div>

        {(!mobile || filtersOpen) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16, background: '#fff', border: `1px solid ${C.lighter}`, borderRadius: 16, padding: 14 }}>
            <div><label htmlFor="f-project" style={label}>Projet</label>
              <select id="f-project" style={field} value={filters.project_id} onChange={setF('project_id')}>
                <option value="">Tous</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div><label htmlFor="f-role" style={label}>Rôle</label>
              <select id="f-role" style={field} value={filters.role} onChange={setF('role')}>
                <option value="">Tous</option><option value="chef_projet">Chef de projet</option><option value="ingenieur">Ingénieur</option>
              </select></div>
            <div><label htmlFor="f-prio" style={label}>Priorité</label>
              <select id="f-prio" style={field} value={filters.priority} onChange={setF('priority')}>
                <option value="">Toutes</option><option value="critical">Critique</option><option value="high">Haute</option>
                <option value="normal">Normale</option><option value="low">Basse</option>
              </select></div>
            <div><label htmlFor="f-from" style={label}>Du</label>
              <input id="f-from" type="date" style={field} value={filters.from} onChange={setF('from')} /></div>
            <div><label htmlFor="f-to" style={label}>Au</label>
              <input id="f-to" type="date" style={field} value={filters.to} onChange={setF('to')} /></div>
            {activeCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button style={btn} onClick={() => setFilters(EMPTY_FILTERS)}>Réinitialiser</button>
              </div>
            )}
          </div>
        )}

        {(tab === 'inbox' || tab === 'unread') && items.some((n) => !n.read_at) && (
          <div style={{ marginBottom: 12 }}>
            <button style={btn} onClick={markAll}><Check size={14} /> Tout marquer comme lu</button>
          </div>
        )}
        {audit && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Historique complet de toutes les mises à jour, même après archivage.</p>}

        {error && <p role="alert" style={{ color: '#b91c1c', fontSize: 13, padding: 12, background: '#fff1f0', borderRadius: 12 }}>{error}</p>}

        <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 0, margin: 0 }}>
          {items.map((n) => <Row key={n.id} n={n} audit={audit} onAct={act} />)}
        </ul>

        {loading && <p style={{ textAlign: 'center', color: C.mid, padding: 24 }}>Chargement…</p>}
        {!loading && !error && items.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', background: '#fff', borderRadius: 24, border: `1px solid ${C.lighter}` }}>
            <p style={{ color: '#4b5563', fontSize: 14, margin: 0 }}>
              {dq || activeCount ? 'Aucun résultat. Essayez d’élargir la recherche ou les filtres.' : 'Aucune mise à jour pour le moment.'}
            </p>
          </div>
        )}
        {!loading && hasMore && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button style={btn} onClick={() => load(items[items.length - 1].id)}>Charger plus</button>
          </div>
        )}
      </main>

      {prefsOpen && <PreferencesModal mobile={mobile} onClose={() => setPrefsOpen(false)} />}
    </div>
  );
}