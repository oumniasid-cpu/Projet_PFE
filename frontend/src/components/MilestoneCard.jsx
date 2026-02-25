import React from 'react';
import { Calendar } from 'lucide-react';

const MilestoneCard = ({ count = 10, date = 'January 7, 2025', daysUntil = 'Domain 17, 2025' }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-3">Next Milestone</h3>
      <div className="text-4xl font-bold text-gray-900 mb-2">{count}</div>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar size={16} />
        <div>
          <div className="font-medium">{date}</div>
          <div className="text-gray-500">{daysUntil}</div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneCard;