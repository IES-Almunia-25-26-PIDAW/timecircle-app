import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Clock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Register: React.FC = () => {
  const { register } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const ok = register(name, email, password);
    setLoading(false);
    if (ok) {
      navigate('/dashboard');
    } else {
      setError('Este email ya está registrado. ¿Quizás quieres iniciar sesión?');
    }
  };

  const benefits = [
    '5 créditos de bienvenida',
    'Acceso a toda la comunidad',
    'Mensajes ilimitados',
    'Sin costes ocultos',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-start">
        {/* Left panel */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900" style={{ fontWeight: 700, fontSize: '1.2rem' }}>TimeCircle</span>
          </div>
          <h2 className="text-slate-900 mb-4" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.3 }}>
            Únete a tu comunidad de vecinos
          </h2>
          <p className="text-slate-600 mb-8" style={{ lineHeight: 1.7 }}>
            Empieza a intercambiar habilidades y favores con tus vecinos. Sin dinero, solo tiempo.
          </p>
          <div className="space-y-3">
            {benefits.map(b => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
                <span className="text-slate-700">{b}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 p-5 bg-teal-600 rounded-2xl text-white">
            <div className="text-3xl mb-1" style={{ fontWeight: 700 }}>5 horas</div>
            <div className="text-teal-200" style={{ fontSize: '0.9rem' }}>de crédito de bienvenida para empezar</div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900" style={{ fontWeight: 700 }}>TimeCircle</span>
          </Link>

          <h1 className="text-slate-900 mb-6" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Crear cuenta</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4" style={{ fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Nombre completo
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 transition-all"
              />
            </div>
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
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors"
              style={{ fontWeight: 600 }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratuita'}
            </button>
          </form>

          <p className="text-center text-slate-500 mt-4" style={{ fontSize: '0.875rem' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-teal-600 hover:text-teal-700">
              Inicia sesión
            </Link>
          </p>

          <p className="text-center text-slate-400 mt-3" style={{ fontSize: '0.75rem' }}>
            Al registrarte aceptas los términos de uso de TimeCircle.
            Sin datos personales sensibles ni dinero real.
          </p>
        </div>
      </div>
    </div>
  );
};
