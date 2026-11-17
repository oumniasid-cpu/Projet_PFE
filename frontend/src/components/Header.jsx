import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../assets/Logo.png';

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '/#fonctionnalites' },
  { label: 'Tarifs', href: '/#tarifs' },
  { label: 'Impact', href: '/#impact' },
  { label: 'Contact', href: '/#contact' },
  { label: 'À propos', to: '/about' },
];

const NavigationItem = ({ label, href, to, onClick, className }) => {
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={href} onClick={onClick} className={className}>
      {label}
    </a>
  );
};

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav
      className="w-full bg-white border-b border-gray-100 px-6 py-4"
      aria-label="Navigation principale"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-3" aria-label="BuildTrack - Accueil">
          <img src={Logo} alt="Logo BuildTrack" className="h-10 w-auto object-contain" />
          <span className="text-2xl font-bold text-slate-800 tracking-tight">
            BuildTrack
          </span>
        </Link>

        {/* Navigation Links - Desktop */}
        <div className="hidden md:flex items-center space-x-10">
          {NAV_LINKS.map(({ label, href, to }) => (
            <NavigationItem
              key={to ?? href}
              label={label}
              href={href}
              to={to}
              className="text-slate-600 font-medium hover:text-slate-900 transition-colors"
            />
          ))}
        </div>

        {/* Action Button - Desktop */}
        <div className="hidden md:flex items-center">
          <Link
            to="/login"
            className="inline-flex items-center bg-[#003366] text-white px-8 py-2.5 rounded-full font-semibold hover:bg-[#002244] transition-all shadow-sm"
          >
            Connexion
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          className="md:hidden text-slate-600 p-2"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="md:hidden mt-4 pb-4 space-y-4 flex flex-col items-center border-t border-gray-100 pt-4"
        >
          {NAV_LINKS.map(({ label, href, to }) => (
            <NavigationItem
              key={to ?? href}
              label={label}
              href={href}
              to={to}
              onClick={closeMenu}
              className="text-slate-600 font-medium"
            />
          ))}
          <Link
            to="/login"
            onClick={closeMenu}
            className="inline-flex items-center justify-center bg-[#003366] text-white px-8 py-2 rounded-lg w-full max-w-50"
          >
            Connexion
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Header;