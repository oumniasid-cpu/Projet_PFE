import React from 'react';

const BudgetCard = ({ spent = 100000, planned = 150000 }) => {
  const spentFormatted = `${(spent / 1000).toFixed(0)}DA`;
  const plannedFormatted = `${(planned / 1000).toFixed(0)}DA`;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-3">Budget Spent vs. Planned</h3>
      <div className="text-4xl font-bold text-gray-900 mb-2">{spentFormatted}</div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-600 font-medium">{spentFormatted}</span>
        <span className="text-sm text-gray-400">/</span>
        <span className="text-sm text-gray-600">Planned {plannedFormatted}</span>
      </div>
    </div>
  );
};

export default BudgetCard;
