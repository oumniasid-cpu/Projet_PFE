import React from 'react';
import Logo from '../assets/Logo.png'; // Replace with your actual path

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white border-t border-gray-100 pt-16 pb-8 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-6">
            <div className="flex items-center gap-3">
              <img src={Logo} alt="BuildTrack" className="h-8 w-auto" />
              <span className="text-xl font-bold text-[#1A365D]">BuildTrack</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              La solution logicielle leader pour le suivi de chantier,
              de la planification initiale à la livraison finale.
            </p>
          </div>

          {/* Produit Column */}
          <div className="space-y-4">
            <h4 className="font-bold text-[#1A365D] text-sm uppercase tracking-wider">Produit</h4>
            <ul className="space-y-3 text-slate-500 text-sm">
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">Planification Gantt</a></li>
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">Suivi Budgétaire</a></li>
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">Application Chantier</a></li>
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">API & Intégrations</a></li>
            </ul>
          </div>

          {/* Entreprise Column */}
          <div className="space-y-4">
            <h4 className="font-bold text-[#1A365D] text-sm uppercase tracking-wider">Entreprise</h4>
            <ul className="space-y-3 text-slate-500 text-sm">
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">Notre Vision</a></li>
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">Recrutement</a></li>
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">Centre de Presse</a></li>
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Légal Column */}
          <div className="space-y-4">
            <h4 className="font-bold text-[#1A365D] text-sm uppercase tracking-wider">Légal</h4>
            <ul className="space-y-3 text-slate-500 text-sm">
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">Confidentialité</a></li>
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">Conditions</a></li>
              <li><a href="#" className="hover:text-[#E67E22] transition-colors">RGPD</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-medium">
            © {currentYear} CONSTRUX TECHNOLOGIES SAS. TOUS DROITS RÉSERVÉS.
          </p>
          
          <div className="flex gap-6 text-[10px] md:text-xs font-bold text-slate-400 tracking-widest uppercase">
            <a href="#" className="hover:text-[#1A365D] transition-colors">Linkedin</a>
            <a href="#" className="hover:text-[#1A365D] transition-colors">Twitter</a>
            <a href="#" className="hover:text-[#1A365D] transition-colors">Instagram</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;