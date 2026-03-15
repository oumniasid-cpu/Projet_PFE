import React, { useState } from 'react';
import { Shield, Building2, X, User, Mail, Phone, Briefcase } from 'lucide-react';

// Utilisation de "export default" pour correspondre à votre import sans accolades
export default function NewUser({ open, onOpenChange, onSubmit }) {
  const initialForm = {
    name: '',
    email: '',
    role: 'engineer',
    phone: '',
    company: ''
  };

  const [formData, setFormData] = useState(initialForm);

  // Logique spécifique pour le téléphone : chiffres uniquement + préfixe '+'
  const handlePhoneChange = (val) => {
    const numbersOnly = val.replace(/\D/g, '');
    const formatted = numbersOnly.length > 0 ? '+' + numbersOnly : '';
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData(initialForm);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Team Member</h2>
            <p className="text-sm text-gray-500">Ils recevront une invitation par email.</p>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <User size={12} /> Full Name *
            </label>
            <input 
              required
              type="text" 
              placeholder="John Doe"
              className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Mail size={12} /> Email Address *
            </label>
            <input 
              required
              type="email" 
              placeholder="john@company.com"
              className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Role *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({...formData, role: 'engineer'})}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  formData.role === 'engineer' 
                  ? 'border-blue-600 bg-blue-50 text-blue-600' 
                  : 'border-gray-100 bg-white text-gray-400'
                }`}
              >
                <Shield size={20} />
                <span className="text-xs font-bold mt-1">Engineer</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, role: 'customer'})}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  formData.role === 'customer' 
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-600' 
                  : 'border-gray-100 bg-white text-gray-400'
                }`}
              >
                <Building2 size={20} />
                <span className="text-xs font-bold mt-1">Customer</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight mt-2">
              Les ingénieurs ont un accès complet. Les clients voient uniquement les rapports.
            </p>
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Phone size={12} /> Phone Number
            </label>
            <input 
              type="text" 
              placeholder="+213..."
              className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
            />
          </div>

          {/* Company */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
              <Briefcase size={12} /> Company
            </label>
            <input 
              type="text" 
              placeholder="Company name"
              className="w-full p-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
            >
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}