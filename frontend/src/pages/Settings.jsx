import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  User, Bell, Shield, Save, Lock, Trash2, Check, X, AlertTriangle
} from 'lucide-react';

import SideBar from '../components/SideBar';

const API_BASE = 'http://localhost:5000/api/auth';

export default function Settings() {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const [name, setName] = useState(storedUser.name || '');
  const [phone, setPhone] = useState('');
  const [notifPrefs, setNotifPrefs] = useState({
    email_alerts: true,
    budget_alerts: true,
    weekly_reports: false,
  });
  const [profileLoading, setProfileLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const [notifError, setNotifError] = useState('');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Le login ne renvoie que id/email/name/role dans localStorage.
  // On charge le profil complet (phone + notification_prefs) ici.
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data.user;
        setName(u.name || '');
        setPhone(u.phone || '');
        setNotifPrefs((prev) => ({ ...prev, ...(u.notification_prefs || {}) }));
      } catch (err) {
        console.error('Impossible de charger le profil complet:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    load();
  }, [token]);

  const handlePhoneChange = (e) => {
    const numbersOnly = e.target.value.replace(/\D/g, '');
    setPhone(numbersOnly.length > 0 ? '+' + numbersOnly : '');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');

    try {
      const response = await axios.put(
        `${API_BASE}/profile`,
        { name, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      localStorage.setItem('user', JSON.stringify(response.data.user));

      setSaveMessage('Profil mis à jour avec succès !');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarde immédiate au clic (optimiste : on met à jour l'UI tout de
  // suite, on revert si le serveur refuse).
  const handleToggleNotif = async (key) => {
    const previous = notifPrefs;
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    setNotifError('');

    try {
      await axios.put(
        `${API_BASE}/notifications`,
        { [key]: next[key] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      setNotifPrefs(previous);
      setNotifError(err.response?.data?.message || 'Erreur lors de la sauvegarde des préférences');
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <SideBar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">

          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold">Paramètres</h1>
            <p className="text-gray-500 mt-1">Gérez votre compte et vos préférences d'application.</p>
          </div>

          <div className="max-w-4xl space-y-6 pb-12">

            {/* Section Profil */}
            <SettingsCard
              title="Informations Personnelles"
              subtitle="Mettez à jour vos détails publics"
              icon={<User className="text-blue-600" />}
              iconBg="bg-blue-50"
            >
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nom Complet</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={profileLoading}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                  <input
                    type="email"
                    defaultValue={storedUser.email}
                    disabled
                    className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Rôle</label>
                  <input
                    type="text"
                    defaultValue={storedUser.role || 'Member'}
                    disabled
                    className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Téléphone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    disabled={profileLoading}
                    placeholder="+ -- -- -- --"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {saveMessage && (
                <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-medium">
                  <Check size={16} /> {saveMessage}
                </div>
              )}
              {saveError && (
                <div className="mt-4 text-red-600 text-sm font-medium">{saveError}</div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving || profileLoading}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} /> {saving ? 'Enregistrement...' : 'Sauvegarder'}
                </button>
              </div>
            </SettingsCard>

            {/* Section Notifications */}
            <SettingsCard
              title="Notifications"
              subtitle="Choisissez ce que vous voulez recevoir"
              icon={<Bell className="text-orange-500" />}
              iconBg="bg-orange-50"
            >
              <div className="space-y-4 mt-2">
                <ToggleRow
                  label="Alertes Email"
                  description="Recevoir les mises à jour des chantiers par mail"
                  enabled={notifPrefs.email_alerts}
                  onToggle={() => handleToggleNotif('email_alerts')}
                />
                <ToggleRow
                  label="Alertes Budget"
                  description="Notifier quand un projet dépasse le budget prévu"
                  enabled={notifPrefs.budget_alerts}
                  onToggle={() => handleToggleNotif('budget_alerts')}
                />
                <ToggleRow
                  label="Rapports Hebdomadaires"
                  description="Résumé de l'activité de la semaine"
                  enabled={notifPrefs.weekly_reports}
                  onToggle={() => handleToggleNotif('weekly_reports')}
                />
              </div>
              {notifError && (
                <div className="mt-3 text-red-600 text-sm font-medium">{notifError}</div>
              )}
            </SettingsCard>

            {/* Section Sécurité */}
            <SettingsCard
              title="Sécurité"
              subtitle="Protégez l'accès à votre compte"
              icon={<Shield className="text-emerald-600" />}
              iconBg="bg-emerald-50"
            >
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-bold">Changer le mot de passe</p>
                      <p className="text-xs text-gray-500">Modifiez votre mot de passe de connexion</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPasswordModalOpen(true)}
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    Modifier
                  </button>
                </div>
              </div>
            </SettingsCard>

            {/* Danger Zone */}
            <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-red-800">Zone de Danger</h3>
                <p className="text-sm text-red-600">Supprimer définitivement votre compte et vos données.</p>
              </div>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                <Trash2 size={18} /> Supprimer
              </button>
            </div>

          </div>
        </main>
      </div>

      {passwordModalOpen && (
        <PasswordModal token={token} onClose={() => setPasswordModalOpen(false)} />
      )}
      {deleteModalOpen && (
        <DeleteAccountModal token={token} onClose={() => setDeleteModalOpen(false)} />
      )}
    </div>
  );
}

// --- Sous-composants réutilisables ---

function SettingsCard({ title, subtitle, icon, iconBg, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          {React.cloneElement(icon, { size: 22 })}
        </div>
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// Contrôlé par le parent (enabled/onToggle) au lieu d'un state local isolé
// — sinon la valeur ne survit jamais à un refresh de page.
function ToggleRow({ label, description, enabled, onToggle }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

function PasswordModal({ token, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `${API_BASE}/password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Changer le mot de passe</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium py-4">
            <Check size={16} /> Mot de passe modifié avec succès.
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Mot de passe actuel"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />

            {error && <div className="text-red-600 text-sm font-medium">{error}</div>}

            <button
              onClick={handleSubmit}
              disabled={saving || !currentPassword || !newPassword}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {saving ? 'Modification...' : 'Confirmer'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteAccountModal({ token, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    setError('');
    setSaving(true);
    try {
      await axios.delete(`${API_BASE}/account`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password },
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression du compte.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-2 mb-4 text-red-700">
          <AlertTriangle size={20} />
          <h3 className="font-bold text-lg">Supprimer le compte</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Cette action est irréversible. Confirmez votre mot de passe pour supprimer définitivement votre compte.
        </p>

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400 mb-3"
        />

        {error && <div className="text-red-600 text-sm font-medium mb-3">{error}</div>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={saving || !password}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 size={16} /> {saving ? 'Suppression...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}