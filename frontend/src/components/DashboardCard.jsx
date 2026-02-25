import React from 'react';

const DashboardCard = ({ title, value, children, className = '' }) => {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      {children ? (
        <div>{children}</div>
      ) : (
        <div className="text-3xl font-bold text-gray-900">{value}</div>
      )}
    </div>
  );
};

export default DashboardCard;