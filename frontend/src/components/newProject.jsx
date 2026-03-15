import React, { useState } from 'react';
import { X, Calendar, Building2, DollarSign, User, MapPin } from 'lucide-react';

export function NewProject({ open, onOpenChange, onProjectCreated }) {
  // État initial correspondant à vos colonnes SQL
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget_total: '',
    start_date: '',
    end_date: '',
    location_city: '',
    location_country: '',
    status: 'planning'
  });

  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newProject = await response.json();
        onProjectCreated(newProject); // Met à jour la liste dans Projects.jsx
        onOpenChange(false); // Ferme le modal
        setFormData({ name: '', description: '', budget_total: '', start_date: '', end_date: '', location_city: '', location_country: '', status: 'planning' });
      } else {
        alert("Erreur lors de la création du projet");
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Nouveau Projet</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Nom du Projet</label>
              <input 
                required
                className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="ex: Tour Résidentielle"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Budget Total (DZD)</label>
              <input 
                required
                type="number"
                className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.budget_total}
                onChange={(e) => setFormData({...formData, budget_total: e.target.value})}
                placeholder="1500000"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
            <textarea 
              className="w-full p-2.5 border rounded-xl h-20 resize-none outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Ville</label>
              <input 
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.location_city}
                onChange={(e) => setFormData({...formData, location_city: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Pays</label>
              <input 
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.location_country}
                onChange={(e) => setFormData({...formData, location_country: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Date de début</label>
              <input 
                required
                type="date"
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Date de fin prévue</label>
              <input 
                required
                type="date"
                className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 transition-all"
            >
              {loading ? 'Création...' : 'Créer le Projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}