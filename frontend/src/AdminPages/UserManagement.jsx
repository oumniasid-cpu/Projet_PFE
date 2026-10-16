import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Shield,
  Building2,
  Trash2,
  Edit2,
} from 'lucide-react';

import SideBar from '../components/SideBar';
import NewUser from '../components/newUser';
import { API_BASE, token } from '../components/notificationsShared'; // réutilise la même base d'API que le reste de l'app

// Vos valeurs de rôle en base (ex: "ingenieur", "chef_projet", "admin")
// ne correspondent pas forcément à l'ancien mock ("engineer", "customer").
// On les classe dans 3 familles pour les filtres/compteurs, tout en
// affichant le rôle réel dans le tableau.
const roleBucket = (role) => {
  const r = String(role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (r.includes('ingenieur') || r.includes('engineer')) return 'engineer';
  if (r.includes('chef') || r.includes('manager')) return 'chef_projet';
  if (r.includes('admin')) return 'admin';
  return 'other';
};

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}/api/users${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Erreur ${res.status}`);
  return data;
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddUser, setShowAddUser] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api(''));
    } catch (e) {
      setError(e.message || 'Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleAddUser = async (data) => {
    setActionError(null);
    try {
      const { user, emailSent, tempPassword } = await api('', {
        method: 'POST',
        body: { name: data.name, email: data.email, role: data.role },
      });
      setUsers((prev) => [user, ...prev]);
      setShowAddUser(false);
      alert(
        emailSent
          ? `Invitation envoyée par e-mail à ${user.name}.`
          : `Utilisateur créé. SMTP non configuré : transmettez ce mot de passe temporaire manuellement à ${user.email} :\n${tempPassword}`
      );
    } catch (e) {
      setActionError(e.message || "Échec de la création de l'utilisateur.");
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Supprimer définitivement ${user.name} ?`)) return;
    try {
      await api(`/${user.id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      setActionError(e.message || 'Échec de la suppression.');
    }
  };

  // Pas de modale d'édition fournie pour l'instant : on permet un
  // changement rapide de statut actif/inactif. À remplacer par une
  // vraie modale d'édition si besoin (rôle, nom, etc.).
  const handleToggleStatus = async (user) => {
    const next = user.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await api(`/${user.id}`, { method: 'PATCH', body: { status: next } });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (e) {
      setActionError(e.message || 'Échec de la mise à jour.');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || roleBucket(user.role) === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <SideBar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
              <p className="text-gray-500 mt-1">Gérez les ingénieurs et les comptes clients</p>
            </div>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Plus className="w-4 h-4" />
              Ajouter un utilisateur
            </button>
          </div>

          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex justify-between items-center">
              {actionError}
              <button onClick={() => setActionError(null)} className="font-bold">×</button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Utilisateurs" value={users.length} icon={<Users />} color="text-blue-600" bg="bg-blue-50" />
            <StatCard title="Ingénieurs" value={users.filter((u) => roleBucket(u.role) === 'engineer').length} icon={<Shield />} color="text-indigo-600" bg="bg-indigo-50" />
            <StatCard title="Chefs de projet" value={users.filter((u) => roleBucket(u.role) === 'chef_projet').length} icon={<Building2 />} color="text-emerald-600" bg="bg-emerald-50" />
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              {['all', 'engineer', 'chef_projet'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    roleFilter === role ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {role === 'all' ? 'Tous' : role === 'engineer' ? 'Ingénieurs' : 'Chef de projet'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <p className="text-center text-gray-400 text-sm py-12">Chargement des utilisateurs…</p>
            ) : error ? (
              <p className="text-center text-red-600 text-sm py-12">{error}</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-12">Aucun utilisateur trouvé.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Utilisateur</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Rôle</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Statut</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => {
                      const bucket = roleBucket(user.role);
                      return (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                {user.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                              bucket === 'engineer' ? 'bg-indigo-50 text-indigo-600' : bucket === 'chef_projet' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {bucket === 'engineer' ? <Shield size={12} /> : <Building2 size={12} />}
                              {String(user.role || '').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              title="Cliquer pour changer le statut"
                              className={`px-2 py-1 rounded-md text-[10px] font-black uppercase cursor-pointer ${
                                user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {user.status || 'active'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                title="Édition complète à venir — utilisez le statut ci-contre pour activer/désactiver"
                                disabled
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(user)}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <NewUser
            open={showAddUser}
            onOpenChange={setShowAddUser}
            onSubmit={handleAddUser}
          />
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${bg} ${color}`}>
        {React.cloneElement(icon, { size: 22 })}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}