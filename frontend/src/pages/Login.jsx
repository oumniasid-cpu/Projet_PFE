import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Auth from '../assets/Auth.jpg';
import Logo from '../assets/Logo.png';
import { Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoginMessage('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      // Save token AND user info (role, name...) in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      console.log('Connexion réussie:', response.data.message);
      navigate('/dashboard'); // Redirect to dashboard
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    }
  };

  const requestResetCode = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetBusy(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setResetCodeSent(true);
      setResetMessage(response.data.message);
    } catch (err) {
      setResetError(err.response?.data?.message || "Impossible d'envoyer le code pour le moment.");
    } finally {
      setResetBusy(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetBusy(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/reset-password', {
        email,
        code: resetCode,
        newPassword,
      });
      setResetMode(false);
      setResetCodeSent(false);
      setResetCode('');
      setNewPassword('');
      setPassword('');
      setLoginMessage(response.data.message);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Impossible de réinitialiser le mot de passe.');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0B1120] p-4 sm:p-8 " >
      <div className="flex flex-col md:flex-row w-full max-w-5xl bg-[#111827] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
        
        {/* Left Side: Illustration */}
        <div className="hidden md:block md:w-1/2 relative bg-linear-to-br from-[#ddeaff] to-[#E1E7F5] p-12">
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={Auth}
              alt="BuildTrack Construction Visualization"
              className="w-full h-auto object-contain rounded-2xl shadow-lg"
            />
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 bg-white flex flex-col justify-center px-8 py-12 lg:px-16">
          {/* Logo & Branding */}
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 mb-2">
              <img src={Logo} alt="Logo" className="w-10 h-10 object-contain" />
              <h1 className="text-2xl font-bold text-[#111827]">BuildTrack</h1>
            </div>
            <h2 className="text-lg font-bold text-[#111827] tracking-widest uppercase mt-4">
              {resetMode ? 'Mot de passe oublié' : 'Authentification'}
            </h2>
          </div>

          {resetMode ? (
            <div className="space-y-5">
              <p className="text-sm text-slate-600 text-center">
                {resetCodeSent
                  ? 'Saisissez le code reçu par e-mail et choisissez un nouveau mot de passe.'
                  : 'Saisissez votre adresse e-mail pour recevoir un code de confirmation.'}
              </p>

              <form className="space-y-4" onSubmit={resetCodeSent ? handlePasswordReset : requestResetCode}>
                <input
                  type="email"
                  placeholder="Adresse e-mail"
                  aria-label="Adresse e-mail"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  readOnly={resetCodeSent}
                />

                {resetCodeSent && (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Code de confirmation à 6 chiffres"
                      aria-label="Code de confirmation"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all placeholder:text-slate-400"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Nouveau mot de passe (6 caractères minimum)"
                      aria-label="Nouveau mot de passe"
                      minLength={6}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#003366] focus:border-[#003366] outline-none transition-all placeholder:text-slate-400"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </>
                )}

                {resetMessage && <p className="text-sm text-emerald-700 text-center" role="status">{resetMessage}</p>}
                {resetError && <p className="text-sm text-red-600 text-center" role="alert">{resetError}</p>}

                <button
                  type="submit"
                  disabled={resetBusy}
                  className="w-full py-3 bg-[#003366] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10 disabled:opacity-60"
                >
                  {resetBusy
                    ? 'Veuillez patienter...'
                    : resetCodeSent
                      ? 'Réinitialiser le mot de passe'
                      : 'Envoyer le code'}
                </button>
              </form>

              {resetCodeSent && (
                <button
                  type="button"
                  onClick={requestResetCode}
                  disabled={resetBusy}
                  className="w-full text-sm font-semibold text-[#E67E22] hover:underline disabled:opacity-60"
                >
                  Renvoyer le code
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setResetCodeSent(false);
                  setResetMessage('');
                  setResetError('');
                }}
                className="w-full text-sm text-slate-500 hover:text-[#1A365D]"
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleLogin}>
              {error && <p className="text-red-500 text-sm mb-4 text-center" role="alert">{error}</p>}
              {loginMessage && <p className="text-emerald-700 text-sm mb-4 text-center" role="status">{loginMessage}</p>}

              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

              <button
                type="submit"
                className="w-full py-3 bg-[#003366] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
              >
                Se connecter
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(true);
                    setError('');
                    setResetMessage('');
                    setResetError('');
                  }}
                  className="text-sm font-semibold text-[#E67E22] hover:underline transition-all"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;