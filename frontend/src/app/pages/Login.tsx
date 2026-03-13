import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Clock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const ok = login(email, password);
    setLoading(false);
    if (ok) {
      navigate('/dashboard');
    } else {
      setError('Email o contraseña incorrectos. Prueba con: ana@timecircle.es / 123456');
    }
  };

  const quickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-900" style={{ fontWeight: 700, fontSize: '1.3rem' }}>TimeCircle</span>
          </Link>
          <p className="text-slate-500 mt-2">Bienvenido de vuelta a tu comunidad</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h1 className="text-slate-900 mb-6" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Iniciar sesión</h1>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span style={{ fontSize: '0.875rem' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.es"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 transition-all"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors"
              style={{ fontWeight: 600 }}
            >
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-slate-500 mt-4" style={{ fontSize: '0.875rem' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-teal-600 hover:text-teal-700">
              Regístrate aquí
            </Link>
          </p>
        </div>

        {/* Demo users */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-slate-500 mb-3 text-center" style={{ fontSize: '0.8rem' }}>Acceso rápido para explorar</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Ana (vecina)', email: 'ana@timecircle.es', pass: '123456' },
              { name: 'Carlos (vecino)', email: 'carlos@timecircle.es', pass: '123456' },
              { name: 'Laura (vecina)', email: 'laura@timecircle.es', pass: '123456' },
              { name: '⚙️ Administrador', email: 'admin@timecircle.es', pass: 'admin123' },
            ].map(u => (
              <button
                key={u.email}
                onClick={() => quickLogin(u.email, u.pass)}
                className="text-left px-3 py-2 rounded-xl border border-slate-200 hover:bg-teal-50 hover:border-teal-300 transition-colors"
                style={{ fontSize: '0.75rem' }}
              >
                <div className="text-slate-700" style={{ fontWeight: 500 }}>{u.name}</div>
                <div className="text-slate-400">{u.email}</div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-slate-400 mt-4" style={{ fontSize: '0.75rem' }}>
          <Link to="/" className="hover:text-slate-600">← Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
};
