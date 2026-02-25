import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const BudgetChart = ({ budgetHistory = [] }) => {
  const [showPrediction, setShowPrediction] = useState(true);

  // Données par défaut si pas de données
  const defaultData = [
    { progress: '0%', budget: 0, prediction: 0 },
    { progress: '50%', budget: 48000, prediction: 50000 },
    { progress: '100%', budget: 90000, prediction: 95000 },
    { progress: '150%', budget: null, prediction: 140000 },
    { progress: '200%', budget: null, prediction: 185000 },
    { progress: '250%', budget: null, prediction: 230000 },
    { progress: '300%', budget: null, prediction: 280000 },
  ];

  const data = budgetHistory.length > 0 ? budgetHistory : defaultData;

  // Calculer la prédiction finale
  const finalPrediction = data[data.length - 1]?.prediction || 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Budget vs. Realized</h3>
        <button
          onClick={() => setShowPrediction(!showPrediction)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors"
        >
          <span className="text-purple-600">✨</span>
          AI Prediction
          <span className={`transform transition-transform ${showPrediction ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrediction" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9333EA" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#9333EA" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey={budgetHistory.length > 0 ? "month" : "progress"}
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6B7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}DA`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value) => [`$${value?.toLocaleString()}`, '']}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          
          {/* Budget réel */}
          <Line
            type="monotone"
            dataKey="budget"
            stroke="#3B82F6"
            strokeWidth={3}
            name="Budget vs."
            dot={{ fill: '#3B82F6', r: 5 }}
            activeDot={{ r: 7 }}
          />
          
          {/* Prédiction IA */}
          {showPrediction && (
            <>
              <Area
                type="monotone"
                dataKey="prediction"
                stroke="#9333EA"
                strokeWidth={3}
                fill="url(#colorPrediction)"
                name="AI Prediction"
                strokeDasharray="5 5"
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>

      {showPrediction && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-purple-600 font-semibold text-sm">AI Prediction</span>
            <span className="text-xs text-purple-600">•</span>
            <span className="text-xs text-purple-700">
              Budget is projected to reach <strong>${(finalPrediction / 1000).toFixed(0)}K</strong> based on current trends
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetChart;