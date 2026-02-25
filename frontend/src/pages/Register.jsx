import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Auth from '../assets/Auth.jpg';
import Logo from '../assets/Logo.png';

const Register = () => {
  const [name, setName] = useState('');  // ← AJOUTÉ
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Basic client-side validation
    if (password !== confirmPassword) {
      return setError('Les mots de passe ne correspondent pas');
    }

    // Validation du nom (optionnel mais recommandé)
    if (!name.trim()) {
      return setError('Veuillez entrer votre nom');
    }

    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name,      // ← AJOUTÉ
        email,
        password
      });

      console.log('Inscription réussie:', response.data.message);
      // Redirect to login after successful registration
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || "Une erreur est survenue lors de l'inscription");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0B1120] p-4 sm:p-8">
      <div className="flex flex-col md:flex-row w-full max-w-5xl bg-[#111827] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
        
        {/* Left Side: Illustration */}
        <div className="hidden md:block md:w-1/2 relative bg-linear-to-br from-[#ddeaff] to-[#E1E7F5] p-12">
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={Auth}
              alt="BuildTrack Registration Visualization"
              className="w-full h-auto object-contain rounded-2xl shadow-lg"
            />
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div className="w-full md:w-1/2 bg-white flex flex-col justify-center px-8 py-12 lg:px-16">
          {/* Logo & Branding */}
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 mb-2">
              <img src={Logo} alt="Logo" className="w-10 h-10 object-contain" />
              <h1 className="text-2xl font-bold text-[#111827]">BuildTrack</h1>
            </div>
            <h2 className="text-lg font-bold text-[#111827] tracking-widest uppercase mt-4">
              Créer un compte
            </h2>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleRegister}>
            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            {/* Name Input - NOUVEAU */}
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Nom complet"
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all placeholder:text-slate-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email Input */}
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="Adresse e-mail"
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all placeholder:text-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="Mot de passe"
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all placeholder:text-slate-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Confirm Password Input */}
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="Confirmer le mot de passe"
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all placeholder:text-slate-400"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-4">
              <button
                type="submit"
                className="w-full py-3 bg-[#E67E22] text-white font-bold rounded-xl hover:bg-[#D35400] transition-colors shadow-lg shadow-[#E67E22]/20"
              >
                S'inscrire
              </button>
              
              <div className="text-center">
                <p className="text-sm text-slate-500">
                  Déjà un compte ?{' '}
                  <Link to="/login" className="font-bold text-[#003366] hover:underline">
                    Se connecter
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;