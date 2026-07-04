import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Shield, 
  Building2, 
  Trash2, 
  Edit2
} from 'lucide-react';

import SideBar from '../components/SideBar';
// 1. IMPORT CORRIGÉ : On l'importe en tant que composant par défaut
import NewUser from '../components/newUser'; 

const mockUsers = [
  { id: '1', name: 'Moustapha', email: 'moustapha@gmail.com', role: 'engineer', status: 'active', projects: 4 },
  { id: '2', name: 'Said', email: 'saidm@gmail.com', role: 'engineer', status: 'active', projects: 3 },
  { id: '3', name: 'sarah', email: 'sarah@gmail.com', role: 'customer', status: 'active', projects: 1 },
  { id: '4', name: 'Eline', email: 'Elinel@gmail.com', role: 'engineer', status: 'inactive', projects: 0 },
];

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddUser, setShowAddUser] = useState(false);

  const handleAddUser = (data) => {
    console.log('Données du formulaire reçues :', data);
    alert(`Invitation envoyée à ${data.name} pour le rôle ${data.role}`);
    setShowAddUser(false);
  };

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Total Utilisateurs" value={mockUsers.length} icon={<Users />} color="text-blue-600" bg="bg-blue-50" />
            <StatCard title="Ingénieurs" value={mockUsers.filter(u => u.role === 'engineer').length} icon={<Shield />} color="text-indigo-600" bg="bg-indigo-50" />
            <StatCard title="Clients" value={mockUsers.filter(u => u.role === 'customer').length} icon={<Building2 />} color="text-emerald-600" bg="bg-emerald-50" />
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
              {['all', 'engineer', 'customer'].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    roleFilter === role ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {role === 'all' ? 'Tous' : role === 'engineer' ? 'Ingénieurs' : 'Clients'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
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
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                          user.role === 'engineer' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {user.role === 'engineer' ? <Shield size={12}/> : <Building2 size={12}/>}
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${
                          user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. APPEL DE VOTRE COMPOSANT PERSONNALISÉ */}
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