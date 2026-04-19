import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Clock, Eye, EyeOff, CheckCircle, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiRegister } from '../api/endpoints';
import { setTokens } from '../api/client';
import { ThemeToggle } from '../components/ThemeToggle';

export const Register: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (!username) {
      const auto = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      setUsername(auto);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!username.trim()) {
      setError('El nombre de usuario es obligatorio');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRegister({
        username: username.trim(),
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
        password2: confirmPassword,
      });
      if (data?.tokens?.access) {
        setTokens(data.tokens.access, data.tokens.refresh);
        const ok = await login(username.trim(), password);
        if (ok) {
          navigate('/dashboard');
          return;
        }
      }
      setError('Error al crear la cuenta. Comprueba los datos.');
    } catch (err: any) {
      const msg =
        err?.username?.[0] ||
        err?.email?.[0] ||
        err?.password?.[0] ||
        err?.detail ||
        'Error al crear la cuenta. Puede que el usuario o email ya existan.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    'Acceso a toda la comunidad',
    'Mensajes ilimitados',
    'Sin costes ocultos',
    'Sin dinero real',
  ];

  /** Pasos del sistema de onboarding para ganar créditos */
  const earnSteps = [
    { icon: '🏷️', action: 'Añade tu primera habilidad',     bonus: '+0,5 cr' },
    { icon: '✋', action: 'Publica tu primer servicio',      bonus: '+0,5 cr' },
    { icon: '🤝', action: 'Completa tu primer intercambio', bonus: '+1 cr' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 transition-colors">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-start">
        {/* Left panel */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900 dark:text-white" style={{ fontWeight: 700, fontSize: '1.2rem' }}>TimeCircle</span>
          </div>
          <h2 className="text-slate-900 dark:text-white mb-4" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.3 }}>
            Únete a tu comunidad de vecinos
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8" style={{ lineHeight: 1.7 }}>
            Empieza a intercambiar habilidades y favores con tus vecinos. Sin dinero, solo tiempo.
          </p>

          {/* Benefits list */}
          <div className="space-y-3 mb-8">
            {benefits.map(b => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{b}</span>
              </div>
            ))}
          </div>

          {/* Onboarding earning panel */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-800 dark:from-teal-700 dark:to-slate-800 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-teal-200" />
              <span className="text-teal-100" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Gana tus primeros créditos
              </span>
            </div>
            <p className="text-teal-200 mb-4" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
              Completa estos pasos al registrarte y empieza con créditos listos para usar:
            </p>
            <div className="space-y-2.5">
              {earnSteps.map(({ icon, action, bonus }) => (
                <div key={action} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                    <span style={{ fontSize: '0.8rem' }}>{action}</span>
                  </div>
                  <span className="text-amber-300 font-bold" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    {bonus}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
              <span className="text-teal-200" style={{ fontSize: '0.8rem' }}>Total posible</span>
              <span className="text-white font-bold" style={{ fontSize: '1rem' }}>hasta 2 cr 🎉</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 p-8">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900 dark:text-white" style={{ fontWeight: 700 }}>TimeCircle</span>
          </Link>

          <h1 className="text-slate-900 dark:text-white mb-6" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Crear cuenta</h1>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-4" style={{ fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => handleFirstNameChange(e.target.value)}
                  placeholder="Ana"
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all"
                  style={{ fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-1" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  Apellidos *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="García"
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all"
                  style={{ fontSize: '0.875rem' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Nombre de usuario *
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                placeholder="ana_garcia"
                required
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all"
                style={{ fontSize: '0.875rem' }}
              />
              <p className="text-slate-400 mt-1" style={{ fontSize: '0.75rem' }}>Solo letras minúsculas, números y guiones bajos</p>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Correo electrónico *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ana@ejemplo.com"
                required
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all"
                style={{ fontSize: '0.875rem' }}
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all pr-10"
                  style={{ fontSize: '0.875rem' }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Confirmar contraseña *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                required
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all"
                style={{ fontSize: '0.875rem' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors mt-1"
              style={{ fontWeight: 600 }}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratuita'}
            </button>
          </form>

          <p className="text-center text-slate-500 dark:text-slate-400 mt-4" style={{ fontSize: '0.875rem' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-teal-600 dark:text-teal-400 hover:text-teal-700">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};