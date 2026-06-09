import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  Clock, ArrowLeft, Mail, MessageSquare, Bug,
  Shield, HelpCircle, Send, CheckCircle, Loader2,
  AlertCircle,
} from 'lucide-react';
import TopNav from '../components/TopNav';
import { apiSendContactMessage } from '../api/endpoints';

type ContactReason = 'soporte' | 'legal' | 'reporte' | 'sugerencia' | 'otro';

const REASONS: { value: ContactReason; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'soporte',    label: 'Soporte técnico', icon: <HelpCircle className="w-5 h-5" />,   desc: 'Problemas con la cuenta, errores o incidencias' },
  { value: 'legal',      label: 'Consulta legal',  icon: <Shield className="w-5 h-5" />,        desc: 'RGPD, privacidad, términos de uso' },
  { value: 'reporte',    label: 'Reportar usuario',icon: <Bug className="w-5 h-5" />,           desc: 'Comportamiento inadecuado o abuso' },
  { value: 'sugerencia', label: 'Sugerencia',       icon: <MessageSquare className="w-5 h-5" />, desc: 'Ideas para mejorar TimeCircle' },
  { value: 'otro',       label: 'Otro motivo',      icon: <Mail className="w-5 h-5" />,          desc: 'Cualquier otra consulta' },
];

const FAQ = [
  {
    id: 1,
    q: '¿Cómo recupero mi contraseña?',
    a: 'Actualmente, contacta con soporte adjuntando el correo de tu cuenta y te ayudaremos a restablecerla.',
  },
  {
    id: 2,
    q: '¿Puedo transferir créditos a otro usuario directamente?',
    a: 'No. Los créditos solo se transfieren a través de intercambios completados. Esto garantiza la integridad del sistema.',
  },
  {
    id: 3,
    q: '¿Qué pasa si un usuario no cumple el servicio acordado?',
    a: 'Puedes cancelar el intercambio y reportar al usuario. Nuestro equipo revisará el caso y tomará las medidas oportunas.',
  },
  {
    id: 4,
    q: '¿TimeCircle cobra alguna comisión?',
    a: 'No. TimeCircle es una plataforma sin ánimo de lucro. No cobramos comisiones ni cuotas por ningún tipo de intercambio.',
  },
  {
    id: 5,
    q: '¿Cómo elimino mi cuenta y mis datos?',
    a: 'Escríbenos a privacidad@timecircle.app con el asunto "Eliminación de cuenta" e incluye tu nombre de usuario. Procesaremos tu solicitud en un máximo de 30 días.',
  },
];

export const Contact: React.FC = () => {
  const [selectedReason, setSelectedReason] = useState<ContactReason | null>(null);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())    e.name    = 'El nombre es obligatorio';
    if (!email.trim())   e.email   = 'El correo es obligatorio';
    const isValidEmail = (val: string) => {
      const em = val.trim();
      const at = em.indexOf('@');
      if (at <= 0) return false;
      const dot = em.lastIndexOf('.');
      if (dot <= at + 1) return false;
      if (dot === em.length - 1) return false;
      return true;
    };
    if (!isValidEmail(email)) e.email = 'Introduce un correo válido';
    if (!selectedReason) e.reason  = 'Selecciona el motivo de contacto';
    if (!message.trim()) e.message = 'El mensaje no puede estar vacío';
    if (message.length < 20) e.message = 'El mensaje debe tener al menos 20 caracteres';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSending(true);
    try {
      await apiSendContactMessage({
        name:    name.trim(),
        email:   email.trim().toLowerCase(),
        reason:  selectedReason,
        message: message.trim(),
      });
      setSent(true);
    } catch (err: any) {
      // Muestra el primer error de validación del backend, o un mensaje genérico
      const firstError =
        err?.name?.[0] ||
        err?.email?.[0] ||
        err?.reason?.[0] ||
        err?.message?.[0] ||
        err?.detail ||
        'No hemos podido enviar tu mensaje. Por favor inténtalo de nuevo.';
      setApiError(firstError);
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setSent(false);
    setName('');
    setEmail('');
    setMessage('');
    setSelectedReason(null);
    setErrors({});
    setApiError('');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      <TopNav />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 bg-teal-100 dark:bg-teal-950/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-slate-900 dark:text-white mb-3" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800 }}>
            ¿En qué podemos ayudarte?
          </h1>
          <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: '1rem', lineHeight: 1.7 }}>
            Nuestro equipo suele responder en <strong className="text-slate-700 dark:text-slate-300">2–5 días hábiles</strong>. Para urgencias críticas usa el correo directo.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Formulario */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 rounded-2xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h2 className="text-slate-900 dark:text-white mb-2" style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                  Mensaje enviado
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-5" style={{ fontSize: '0.9rem' }}>
                  Hemos recibido tu consulta. Te responderemos en el menor tiempo posible en <strong>{email}</strong>.
                </p>
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
                  style={{ fontSize: '0.875rem', fontWeight: 600 }}
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-5 shadow-sm">
                <h2 className="text-slate-900 dark:text-white" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  Formulario de contacto
                </h2>

                {/* Error de API */}
                {apiError && (
                  <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span style={{ fontSize: '0.875rem' }}>{apiError}</span>
                  </div>
                )}

                {/* Nombre y email */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-slate-700 dark:text-slate-300 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Nombre *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: '' })); }}
                      placeholder="Tu nombre"
                      className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all ${errors.name ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                      style={{ fontSize: '0.875rem' }}
                    />
                    {errors.name && <p className="text-red-500 mt-1" style={{ fontSize: '0.75rem' }}>{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-slate-700 dark:text-slate-300 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Correo electrónico *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })); }}
                      placeholder="tu@correo.com"
                      className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all ${errors.email ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                      style={{ fontSize: '0.875rem' }}
                    />
                    {errors.email && <p className="text-red-500 mt-1" style={{ fontSize: '0.75rem' }}>{errors.email}</p>}
                  </div>
                </div>

                {/* Motivo */}
                <div>
                  <fieldset className="border-0 p-0 m-0">
                    <legend className="block text-slate-700 dark:text-slate-300 mb-2" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      Motivo de contacto *
                    </legend>
                  </fieldset>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {REASONS.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => { setSelectedReason(r.value); setErrors(v => ({ ...v, reason: '' })); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          selectedReason === r.value
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700'
                        }`}
                      >
                        <div className={`flex-shrink-0 ${selectedReason === r.value ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                          {r.icon}
                        </div>
                        <div>
                          <div className={`${selectedReason === r.value ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`} style={{ fontWeight: 600, fontSize: '0.8rem' }}>
                            {r.label}
                          </div>
                          <div className="text-slate-400 dark:text-slate-500" style={{ fontSize: '0.7rem' }}>{r.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.reason && <p className="text-red-500 mt-1" style={{ fontSize: '0.75rem' }}>{errors.reason}</p>}
                </div>

                {/* Mensaje */}
                <div>
                  <label htmlFor="contact-message" className="block text-slate-700 dark:text-slate-300 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    Mensaje *
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={e => { setMessage(e.target.value); setErrors(v => ({ ...v, message: '' })); }}
                    placeholder="Describe tu consulta con el mayor detalle posible..."
                    rows={5}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none transition-all ${errors.message ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}`}
                    style={{ fontSize: '0.875rem' }}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.message
                      ? <p className="text-red-500" style={{ fontSize: '0.75rem' }}>{errors.message}</p>
                      : <span />
                    }
                    <span className={`dark:text-slate-500 ${message.length < 20 ? 'text-red-400' : 'text-slate-400'}`} style={{ fontSize: '0.7rem' }}>
                      {message.length}/5000
                    </span>
                  </div>
                </div>

                {/* Aviso RGPD */}
                <p className="text-slate-400 dark:text-slate-500" style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                  Al enviar este formulario aceptas que procesemos tus datos para atender tu consulta, de acuerdo con nuestra{' '}
                  <Link to="/terminos" className="text-teal-600 dark:text-teal-400 hover:underline">política de privacidad</Link>.
                </p>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  style={{ fontWeight: 600 }}
                >
                  {sending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                    : <><Send className="w-4 h-4" /> Enviar mensaje</>
                  }
                </button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-5">
            {/* Contacto directo */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-slate-900 dark:text-white mb-4" style={{ fontWeight: 700, fontSize: '1rem' }}>
                Contacto directo
              </h3>
              <div className="space-y-3">
                {[
                  { icon: <HelpCircle className="w-4 h-4" />, label: 'Soporte técnico',  email: 'soporte@timecircle.app',    color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' },
                  { icon: <Shield className="w-4 h-4" />,     label: 'Privacidad y datos',email: 'privacidad@timecircle.app', color: 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400' },
                  { icon: <Bug className="w-4 h-4" />,        label: 'Reportar abuso',   email: 'abuso@timecircle.app',      color: 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400' },
                ].map(({ icon, label, email, color }) => (
                  <a key={email} href={`mailto:${email}`} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors group">
                    <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-slate-700 dark:text-slate-300" style={{ fontWeight: 500, fontSize: '0.8rem' }}>{label}</div>
                      <div className="text-teal-600 dark:text-teal-400 group-hover:underline truncate" style={{ fontSize: '0.75rem' }}>{email}</div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500" style={{ fontSize: '0.75rem' }}>
                  <Clock className="w-3.5 h-3.5" />
                  Tiempo de respuesta: 2–5 días hábiles
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-slate-900 dark:text-white mb-4" style={{ fontWeight: 700, fontSize: '1rem' }}>
                Preguntas frecuentes
              </h3>
              <div className="space-y-2">
                {FAQ.map((item, i) => (
                  <div key={item.id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-slate-700 dark:text-slate-300" style={{ fontWeight: 500, fontSize: '0.8rem', lineHeight: 1.4 }}>
                        {item.q}
                      </span>
                      <span className={`text-teal-500 flex-shrink-0 mt-0.5 transition-transform ${openFaq === i ? 'rotate-45' : ''}`} style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4">
                        <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Link a términos */}
            <Link
              to="/terminos"
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-teal-300 dark:hover:border-teal-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-100 dark:bg-teal-950/40 rounded-lg flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-slate-700 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Términos y Condiciones
                  </div>
                  <div className="text-slate-400 dark:text-slate-500" style={{ fontSize: '0.75rem' }}>Leer documento completo</div>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-teal-500 rotate-180 transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer mínimo */}
      <footer className="border-t border-slate-100 dark:border-slate-800 mt-12 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 dark:text-slate-500" style={{ fontSize: '0.8rem' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-500" />
            <span className="text-slate-900 dark:text-white" style={{ fontWeight: 600 }}>TimeCircle</span>
            <span>· Banco de Tiempo Comunitario</span>
          </div>
          <div className="flex gap-4">
            <Link to="/terminos" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Términos</Link>
            <Link to="/" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Inicio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};