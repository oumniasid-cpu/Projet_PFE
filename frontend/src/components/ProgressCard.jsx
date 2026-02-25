import React from 'react';

const ProgressCard = ({ progress = 75 }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-3">Overall Progress</h3>
      <div className="text-4xl font-bold text-gray-900 mb-3">{progress}%</div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressCard;