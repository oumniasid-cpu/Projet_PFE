import React from 'react';

const TopBar = () => {
  return (
    <header className="w-full bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
      {/* Titre de la page */}
      <h1 className="text-2xl font-bold text-[#1A365D]">Dashboard</h1>

      {/* Actions & Profil */}
      <div className="flex items-center gap-6">
        
        {/* Sélecteur de Dashboard (Dropdown) */}
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-gray-50 transition-colors shadow-sm">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Dashboard
          <svg className="w-4 h-4 text-slate-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Aide (Icone ?) */}
        <button className="text-slate-400 hover:text-[#1A365D] transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Notifications avec Badge Rouge */}
        <button className="relative text-slate-400 hover:text-[#1A365D] transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-[10px] text-white font-bold items-center justify-center border-2 border-white">
            1
          </span>
        </button>

        {/* Profil Utilisateur */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-100 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden ring-2 ring-transparent group-hover:ring-[#1A365D]/10 transition-all">
            <img 
              src="https://randomuser.me/api/portraits/men/32.jpg" 
              alt="User profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <svg className="w-4 h-4 text-slate-400 group-hover:text-[#1A365D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

      </div>
    </header>
  );
};

export default TopBar;