import React, { useState } from 'react';
import Logo from '../assets/Logo.png'; // Imported as 'Logo'

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full bg-white border-b border-gray-100 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center">
            <img 
              src={Logo} // Using the correct variable name here
              alt="ConstruX Logo" 
              className="h-10 w-auto object-contain" 
            />
            <span className="ml-3 text-2xl font-bold text-slate-800 tracking-tight">
              BuildTrack
            </span>
          </div>
        </div>

        {/* Navigation Links - Centered on Desktop */}
        <div className="hidden md:flex items-center space-x-10">
          <a href="#features" className="text-slate-600 font-medium hover:text-slate-900 transition-colors">
            Fonctionnalités
          </a>
          <a href="#impact" className="text-slate-600 font-medium hover:text-slate-900 transition-colors">
            Tarifs
          </a>
          <a href="#impact" className="text-slate-600 font-medium hover:text-slate-900 transition-colors">
            Impact
          </a>
          <a href="#impact" className="text-slate-600 font-medium hover:text-slate-900 transition-colors">
            Contact
          </a>
          <a href="#about" className="text-slate-600 font-medium hover:text-slate-900 transition-colors">
            À propos
          </a>
        </div>

        {/* Action Button */}
        <div className="hidden md:flex items-center">
          <button className="bg-[#003366] text-white px-8 py-2.5 rounded-full font-semibold hover:bg-[#002244] transition-all shadow-sm">
            Connexion
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-slate-600 p-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </div>

      {/* Optional: Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden mt-4 pb-4 space-y-4 flex flex-col items-center border-t border-gray-100 pt-4">
          <a href="#features" className="text-slate-600 font-medium">Fonctionnalités</a>
          <a href="#impact" className="text-slate-600 font-medium">Impact</a>
          <a href="#about" className="text-slate-600 font-medium">À propos</a>
          <button className="bg-[#003366] text-white px-8 py-2 rounded-lg w-full max-w-50 ">
            Connexion
          </button>
        </div>
      )}
    </nav>
  );
};

export default Header;