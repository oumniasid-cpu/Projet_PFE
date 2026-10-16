import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { API_BASE, C, api, token, timeAgo, useIsMobile, PriorityChip } from './notificationsShared';

// Drop <NotificationBell /> in your Sidebar or top bar. Renders nothing for non-admins:
// the backend would answer 403 anyway, but this avoids useless requests.
export default function NotificationBell({ isAdmin = true }) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const refresh = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([api('/unread-count'), api('?status=unread&limit=8')]);
      setUnread(c.count);
      setItems(l.items);
    } catch { /* offline: keep last state */ }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
    const poll = setInterval(refresh, 60_000); // safety net if the stream drops
    const es = new EventSource(`${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token())}`);
    es.addEventListener('notification', (e) => {
      const n = JSON.parse(e.data);
      setUnread((u) => u + 1);
      setItems((prev) => [n, ...prev].slice(0, 8));
      if (!n.silent) setToast(n);                       // respects quiet hours / min priority
      window.dispatchEvent(new Event('notifications:new'));
    });
    const onChanged = () => refresh();
    window.addEventListener('notifications:changed', onChanged);
    return () => {
      clearInterval(poll);
      es.close();
      window.removeEventListener('notifications:changed', onChanged);
    };
  }, [isAdmin, refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!isAdmin) return null;

  const openItem = async (n) => {
    setOpen(false);
    setToast(null);
    try { await api(`/${n.id}`, { method: 'PATCH', body: { read: true } }); } catch { /* ignore */ }
    refresh();
    navigate('/notifications');
  };
  const markAll = async () => { try { await api('/mark-all-read', { method: 'POST' }); } catch { /* ignore */ } refresh(); };

  // The sidebar scrolls (overflow:auto) and would clip an absolute dropdown, so the panel is
  // position:fixed and opens to the right of the bell.
  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: r.right + 12, top: r.top });
    setOpen((o) => !o);
  };
  const panel = mobile
    ? { position: 'fixed', left: 8, right: 8, top: 64 }
    : {
        position: 'fixed', width: 380,
        left: Math.max(8, Math.min(pos.left, window.innerWidth - 392)),
        top: Math.max(8, Math.min(pos.top, window.innerHeight - 480)),
      };

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label={`Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`}
        aria-haspopup="dialog" aria-expanded={open}
        style={{ position: 'relative', width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.lighter}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bell size={18} color={C.primary} />
        {unread > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: '#b91c1c', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" style={{ ...panel, zIndex: 60, background: '#fff', border: `1px solid ${C.lighter}`, borderRadius: 20, boxShadow: '0 12px 32px rgba(4,44,83,0.14)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: `1px solid ${C.pale}` }}>
            <strong style={{ fontSize: 14, color: C.dark }}>Notifications</strong>
            {unread > 0 && (
              <button onClick={markAll} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div style={{ maxHeight: mobile ? '60vh' : 380, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <p style={{ padding: 28, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>Aucune nouvelle mise à jour.</p>
            ) : items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: `1px solid ${C.pale}`, padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontSize: 13, color: C.dark }}>{n.actor_name}</strong>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{timeAgo(n.created_at)}</span>
                </div>
                <p style={{ fontSize: 12, color: C.medium, margin: '2px 0' }}>
                  {[n.project_name, n.task_name].filter(Boolean).join(' › ')}
                </p>
                <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px' }}>{n.summary}</p>
                {(n.priority === 'high' || n.priority === 'critical') && <PriorityChip priority={n.priority} />}
              </button>
            ))}
          </div>
          <button onClick={() => { setOpen(false); navigate('/notifications'); }} style={{ width: '100%', padding: 12, background: C.pale, border: 'none', color: C.primary, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Voir toutes les notifications
          </button>
        </div>
      )}

      {/* Live toast: small, bottom corner, auto-dismiss, announced politely to screen readers */}
      <div aria-live="polite" role="status">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', zIndex: 70, bottom: 16, right: mobile ? 8 : 20, left: mobile ? 8 : 'auto', width: mobile ? 'auto' : 340, background: '#fff', border: `1px solid ${C.lighter}`, borderLeft: `4px solid ${C.primary}`, borderRadius: 16, padding: '12px 14px', boxShadow: '0 8px 24px rgba(4,44,83,0.16)', display: 'flex', gap: 10 }}
            >
              <button onClick={() => openItem(toast)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <strong style={{ fontSize: 13, color: C.dark }}>{toast.actor_name}</strong>
                <span style={{ fontSize: 12, color: C.medium }}> – {toast.project_name || 'Projet'}</span>
                <p style={{ fontSize: 13, color: '#374151', margin: '2px 0 0' }}>{toast.summary}</p>
              </button>
              <button onClick={() => setToast(null)} aria-label="Fermer l'alerte" style={{ background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
                <X size={16} color="#6b7280" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}