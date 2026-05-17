import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Clock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { apiRequestPasswordReset, apiConfirmPasswordReset } from '../api/endpoints';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Password reset mode (replace the login view)
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) {
      navigate('/dashboard');
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);
    try {
      await apiRequestPasswordReset(resetEmail);
      setResetMessage('Código enviado al correo. Revisa tu bandeja (spam si no aparece).');
      toast.success('Código enviado al correo.');
      setResetStep(2);
    } catch (err: any) {
      setResetError(err?.email || err?.detail || 'Error al enviar el código.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      await apiConfirmPasswordReset(resetEmail, resetCode, resetNewPassword);
      toast.success('Contraseña actualizada correctamente.');
      // reset state and return to login view
      setResetStep(1);
      setResetEmail('');
      setResetCode('');
      setResetNewPassword('');
      setResetMessage('');
      setIsResetMode(false);
    } catch (err: any) {
      setResetError(err?.code || err?.detail || 'Error al confirmar el código.');
    } finally {
      setResetLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md shadow-teal-500/30">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-900 dark:text-white" style={{ fontWeight: 700, fontSize: '1.3rem' }}>TimeCircle</span>
          </Link>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Bienvenido de vuelta a tu comunidad</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-slate-950/60 border border-slate-100 dark:border-slate-800 p-8">
          <h1 className="text-slate-900 dark:text-white mb-6" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {isResetMode ? 'Restablecer contraseña' : 'Iniciar sesión'}
          </h1>

          {isResetMode ? (
            <ResetPanel
              resetError={resetError}
              resetMessage={resetMessage}
              resetStep={resetStep}
              resetEmail={resetEmail}
              setResetEmail={setResetEmail}
              resetCode={resetCode}
              setResetCode={setResetCode}
              resetNewPassword={resetNewPassword}
              setResetNewPassword={setResetNewPassword}
              resetLoading={resetLoading}
              handleSendCode={handleSendCode}
              handleConfirmReset={handleConfirmReset}
              setIsResetMode={setIsResetMode}
              setResetStep={setResetStep}
              setResetMessage={setResetMessage}
              setResetError={setResetError}
            />
          ) : (
            <LoginPanel
              error={error}
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              showPass={showPass}
              setShowPass={setShowPass}
              loading={loading}
              handleSubmit={handleSubmit}
              setIsResetMode={setIsResetMode}
              setResetStep={setResetStep}
              setResetMessage={setResetMessage}
              setResetError={setResetError}
            />
          )}
        </div>

        <p className="text-center text-slate-400 dark:text-slate-500 mt-4" style={{ fontSize: '0.75rem' }}>
          <Link to="/" className="hover:text-slate-600 dark:hover:text-slate-300">← Volver al inicio</Link>
        </p>
      </div>
    </div>
  );
};

const LoginPanel: React.FC<any> = ({ error, username, setUsername, password, setPassword, showPass, setShowPass, loading, handleSubmit, setIsResetMode, setResetStep, setResetMessage, setResetError }) => (
  <>
    {error && (
      <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-4">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span style={{ fontSize: '0.875rem' }}>{error}</span>
      </div>
    )}

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="login-username" className="block text-slate-700 dark:text-slate-300 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Nombre de usuario
        </label>
        <input
          id="login-username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="tu_usuario"
          required
          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="block text-slate-700 dark:text-slate-300 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Contraseña
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 disabled:opacity-60 text-white rounded-xl transition-colors shadow-sm shadow-teal-500/30"
        style={{ fontWeight: 600 }}
      >
        {loading ? 'Entrando...' : 'Iniciar sesión'}
      </button>
    </form>

    <p className="text-center mt-3">
      <button
        type="button"
        onClick={() => { setIsResetMode(true); setResetStep(1); setResetMessage(''); setResetError(''); }}
        className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
      >
        ¿Has olvidado la contraseña?
      </button>
    </p>

    <p className="text-center text-slate-500 dark:text-slate-400 mt-4" style={{ fontSize: '0.875rem' }}>
      ¿No tienes cuenta?{' '}
      <Link to="/register" className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300">
        Regístrate aquí
      </Link>
    </p>
  </>
);

const ResetPanel: React.FC<any> = ({ resetError, resetMessage, resetStep, resetEmail, setResetEmail, resetCode, setResetCode, resetNewPassword, setResetNewPassword, resetLoading, handleSendCode, handleConfirmReset, setIsResetMode, setResetStep, setResetMessage, setResetError }) => (
  <>
    {resetError && <div className="text-red-600 mb-2 text-sm">{resetError}</div>}
    {resetMessage && <div className="text-green-600 mb-2 text-sm">{resetMessage}</div>}

    {resetStep === 1 ? (
      <form onSubmit={handleSendCode} className="space-y-3">
        <div>
          <label htmlFor="reset-email" className="block text-slate-700 dark:text-slate-300 mb-1.5">Correo electrónico</label>
            <input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setIsResetMode(false)} className="text-sm text-slate-500">Cancelar</button>
          <button type="submit" disabled={resetLoading} className="py-2 px-4 bg-teal-600 text-white rounded-lg text-sm">
            {resetLoading ? 'Enviando...' : 'Enviar código'}
          </button>
        </div>
      </form>
    ) : (
      <form onSubmit={handleConfirmReset} className="space-y-3">
        <div>
          <label htmlFor="reset-code" className="block text-slate-700 dark:text-slate-300 mb-1.5">Código (6 dígitos)</label>
          <input
            id="reset-code"
            type="text"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value)}
            required
            maxLength={6}
            className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label htmlFor="reset-new-password" className="block text-slate-700 dark:text-slate-300 mb-1.5">Nueva contraseña</label>
          <input
            id="reset-new-password"
            type="password"
            value={resetNewPassword}
            onChange={(e) => setResetNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => { setResetStep(1); setResetMessage(''); setResetError(''); }} className="text-sm text-slate-500">Volver</button>
          <button type="submit" disabled={resetLoading} className="py-2 px-4 bg-teal-600 text-white rounded-lg text-sm">
            {resetLoading ? 'Confirmando...' : 'Cambiar contraseña'}
          </button>
        </div>
      </form>
    )}

    <div className="mt-3 text-right">
      <button onClick={() => setIsResetMode(false)} className="text-sm text-slate-500">Volver al login</button>
    </div>
  </>
);