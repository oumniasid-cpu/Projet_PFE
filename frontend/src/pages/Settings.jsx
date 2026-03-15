import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Save, 
  Lock,
  Eye,
  Trash2
} from 'lucide-react';

// Vos composants de navigation
import SideBar from '../components/SideBar';
import TopBar from '../components/TopBar';

export default function Settings() {
  // Simulation de l'utilisateur (à remplacer par votre context auth)
  const user = { name: "Prénom Nom", email: "contact@entreprise.com", role: "Engineer" };
const [phone, setPhone] = useState('');

const handlePhoneChange = (e) => {
  // 1. On récupère la valeur saisie
  const input = e.target.value;
  
  // 2. On enlève tout ce qui n'est pas un chiffre (Regex)
  const numbersOnly = input.replace(/\D/g, '');
  
  // 3. On ajoute le + au début s'il y a au moins un chiffre
  if (numbersOnly.length > 0) {
    setPhone('+' + numbersOnly);
  } else {
    setPhone('');
  }
};
  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <SideBar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
       
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
          
          {/* Header */}
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
                  <input type="text" defaultValue={user.name} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                  <input type="email" defaultValue={user.email} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Rôle</label>
                  <input type="text" defaultValue={user.role} disabled className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-400 cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Téléphone</label>
                  <input type="text" value={phone} onChange={handlePhoneChange} placeholder="+213 -- -- -- --" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all">
                  <Save size={18} /> Sauvegarder
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
                <ToggleRow label="Alertes Email" description="Recevoir les mises à jour des chantiers par mail" defaultEnabled={true} />
                <ToggleRow label="Alertes Budget" description="Notifer quand un projet dépasse le budget prévu" defaultEnabled={true} />
                <ToggleRow label="Rapports Hebdomadaires" description="Résumé de l'activité de la semaine" defaultEnabled={false} />
              </div>
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
                      <p className="text-xs text-gray-500">Dernière modification : il y a 3 mois</p>
                    </div>
                  </div>
                  <button className="text-sm font-bold text-blue-600 hover:underline">Modifier</button>
                </div>
              </div>
            </SettingsCard>

            {/* Danger Zone */}
            <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-red-800">Zone de Danger</h3>
                <p className="text-sm text-red-600">Supprimer définitivement votre compte et vos données.</p>
              </div>
              <button className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition-all">
                <Trash2 size={18} /> Supprimer
              </button>
            </div>

          </div>
        </main>
      </div>
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

function ToggleRow({ label, description, defaultEnabled }) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-bold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button 
        onClick={() => setEnabled(!enabled)}
        className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}