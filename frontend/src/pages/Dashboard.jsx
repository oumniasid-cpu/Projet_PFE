import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SideBar from '../components/SideBar';
// Imports des icônes Lucide
import {
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';



// Imports des composants Recharts pour les graphiques
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
     
      const response = await fetch('http://localhost:5000/api/dashboard/stats', {
          headers: {
              'Authorization': `Bearer ${token}`
          }
      });

      if (!response.ok) throw new Error('Erreur serveur');
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Erreur stats:", error);
    } finally {
      setLoading(false);
    }
  };
  fetchStats();
}, []);


  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Chargement des données...</p>
        </div>
    </div>
  );

  if (!data) return <div className="p-10 text-center">Erreur de chargement des données.</div>;

  // Formattage du budget (ex: 45.2M)
  const formatMoney = (val) => {
    const num = Number(val);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div className="flex h-screen bg-gray-100 text-gray-900">
      <SideBar/>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1>
              <p className="text-gray-500 mt-1">Données en temps réel de vos chantiers.</p>
            </div>
            <Link to="/projects">
              <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                Voir tous les projets <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          {/* Metrics Grid Dynamique */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricBox
              title="Projets Actifs" 
              value={data.metrics.active_projects} 
              icon={<Building2 />} color="text-blue-600" bg="bg-blue-50" 
            />
            <MetricBox 
              title="Budget Total" 
              value={`${formatMoney(data.metrics.total_budget)} DA`} 
              icon={<DollarSign />} color="text-green-600" bg="bg-green-50" 
            />
            <MetricBox 
              title="Progression Moyenne" 
              value={`${data.metrics.avg_progress}%`} 
              icon={<TrendingUp />} color="text-purple-600" bg="bg-purple-50" 
            />
            <MetricBox 
              title="Alertes" 
              value={data.metrics.alerts} 
              icon={<AlertTriangle />} color="text-red-600" bg="bg-red-50" 
            />
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold mb-4 text-gray-800">Dépenses vs Budget Initial</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.budgetHistory}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(value) => formatMoney(value)} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    <Area type="monotone" dataKey="budget" stroke="#2563eb" fillOpacity={0.1} fill="#2563eb" strokeWidth={3} name="Prévu" />
                    <Area type="monotone" dataKey="spent" stroke="#ef4444" fillOpacity={0.1} fill="#ef4444" strokeWidth={3} name="Consommé" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-bold mb-4 text-gray-800">Dernières Mises à Jour</h3>
              <div className="space-y-6 mt-4">
                {data.individualProgress && data.individualProgress.map((p, idx) => (
                  <SimpleProgressBar 
                    key={idx} 
                    label={p.name} 
                    progress={p.progress} 
                    color={p.progress > 80 ? "bg-green-500" : p.progress < 30 ? "bg-red-500" : "bg-blue-600"} 
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- Sous-composants indispensables ---

const MetricBox = ({ title, value, icon, color, bg }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${bg} ${color}`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const SimpleProgressBar = ({ label, progress, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-gray-500">{progress}%</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-500 ${color}`} 
        style={{ width: `${progress}%` }} 
      />
    </div>
  </div>
);

export default Dashboard;