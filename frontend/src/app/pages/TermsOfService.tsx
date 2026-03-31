import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Clock, ArrowLeft, ChevronRight } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const SECTIONS = [
  { id: 'objeto',        title: '1. Objeto y ámbito' },
  { id: 'registro',      title: '2. Registro y cuenta' },
  { id: 'creditos',      title: '3. Sistema de créditos' },
  { id: 'servicios',     title: '4. Publicación de servicios' },
  { id: 'intercambios',  title: '5. Intercambios (Trades)' },
  { id: 'conducta',      title: '6. Normas de conducta' },
  { id: 'privacidad',    title: '7. Privacidad de datos' },
  { id: 'limitaciones',  title: '8. Limitación de responsabilidad' },
  { id: 'modificaciones',title: '9. Modificaciones' },
  { id: 'contacto',      title: '10. Contacto' },
];

export const TermsOfService: React.FC = () => {
  const [activeSection, setActiveSection] = useState('objeto');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" style={{ fontSize: '0.875rem' }}>
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
            <span className="text-slate-200 dark:text-slate-700">|</span>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-slate-900 dark:text-white" style={{ fontWeight: 700, fontSize: '1rem' }}>TimeCircle</span>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-teal-800/50 px-3 py-1.5 rounded-full mb-4" style={{ fontSize: '0.8rem' }}>
            Documento legal
          </div>
          <h1 className="text-slate-900 dark:text-white mb-3" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, lineHeight: 1.2 }}>
            Términos y Condiciones de Uso
          </h1>
          <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: '0.95rem' }}>
            Última actualización: 1 de enero de 2026 · Versión 1.0
          </p>
        </div>

        <div className="flex gap-10 items-start">
          {/* Sidebar TOC — fijo en desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-24">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 mb-3" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contenido
              </p>
              <nav className="space-y-0.5">
                {SECTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                      activeSection === s.id
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${activeSection === s.id ? 'rotate-90' : ''}`} />
                    {s.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Contenido principal */}
          <article className="flex-1 min-w-0 prose-custom" style={{ lineHeight: 1.8 }}>
            {/* Intro */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-5 mb-8">
              <p className="text-amber-900 dark:text-amber-300 m-0" style={{ fontSize: '0.9rem' }}>
                <strong>Importante:</strong> Al registrarte en TimeCircle aceptas estos términos en su totalidad. Lee este documento con atención antes de crear tu cuenta o publicar servicios.
              </p>
            </div>

            <Section id="objeto" title="1. Objeto y ámbito de aplicación">
              <p>TimeCircle es una plataforma digital de banco de tiempo comunitario que facilita el intercambio de servicios y favores entre vecinos mediante un sistema de créditos horarios. No interviene como intermediario comercial ni realiza transacciones económicas de ningún tipo.</p>
              <p>Estos términos regulan el acceso y uso de la plataforma disponible en <strong>timecircle.app</strong> y sus versiones móviles. Son de aplicación a todos los usuarios registrados, independientemente de su rol (vecino, administrador o moderador).</p>
              <p>El uso de la plataforma implica la aceptación plena e incondicional de todos los términos aquí recogidos. Si no estás de acuerdo con alguno de ellos, debes abstenerte de usar el servicio.</p>
            </Section>

            <Section id="registro" title="2. Registro y gestión de cuenta">
              <p>Para acceder a las funcionalidades de TimeCircle es necesario crear una cuenta personal. Al registrarte, garantizas que:</p>
              <ul>
                <li>Tienes 14 años o más. Si eres menor de edad, necesitas el consentimiento de tu tutor legal.</li>
                <li>Los datos facilitados (nombre, correo electrónico, ubicación) son verídicos y actualizados.</li>
                <li>No suplantarás la identidad de otra persona ni crearás cuentas múltiples.</li>
                <li>Mantendrás la confidencialidad de tu contraseña y serás responsable de toda la actividad realizada desde tu cuenta.</li>
              </ul>
              <p>TimeCircle se reserva el derecho a suspender o eliminar cuentas que incumplan estos términos, sin necesidad de aviso previo en casos graves.</p>
              <p>Puedes solicitar la eliminación de tu cuenta en cualquier momento desde la sección de ajustes o contactando con nuestro equipo. La eliminación es irreversible y conlleva la pérdida de todos los créditos acumulados.</p>
            </Section>

            <Section id="creditos" title="3. Sistema de créditos horarios">
              <p>La economía de TimeCircle se basa íntegramente en <strong>créditos horarios</strong>, una moneda interna sin valor monetario real ni posibilidad de conversión a divisas.</p>
              <Highlight>
                1 crédito horario = 1 hora de servicio prestado. No existe equivalencia económica alguna.
              </Highlight>
              <p>Normas del sistema de créditos:</p>
              <ul>
                <li>Cada usuario recibe <strong>10 créditos de bienvenida</strong> al registrarse.</li>
                <li>Los créditos se transfieren automáticamente al completar un intercambio.</li>
                <li>El saldo mínimo permitido es 0 créditos; no se permite deuda.</li>
                <li>Los créditos no caducan mientras la cuenta esté activa.</li>
                <li>Los créditos no son transferibles entre cuentas fuera del sistema de intercambios.</li>
                <li>TimeCircle no garantiza la convertibilidad ni el valor de los créditos.</li>
              </ul>
              <p>Los ajustes manuales de créditos realizados por administradores quedarán registrados en el historial de transacciones del usuario.</p>
            </Section>

            <Section id="servicios" title="4. Publicación de servicios">
              <p>Cualquier usuario puede publicar ofertas (servicios que ofrece) o solicitudes (servicios que necesita). Al publicar un servicio, el usuario garantiza que:</p>
              <ul>
                <li>Dispone de los conocimientos, habilidades y en su caso habilitaciones legales necesarias para prestar el servicio.</li>
                <li>El servicio descrito es real, posible y ejecutable en los términos indicados.</li>
                <li>No vulnera ninguna legislación aplicable ni los derechos de terceros.</li>
              </ul>
              <p><strong>Contenidos prohibidos:</strong> No está permitido publicar servicios relacionados con actividades ilegales, servicios sexuales, venta de sustancias, armas, juegos de azar, o cualquier actividad que pueda causar daño físico, psicológico o económico a terceros.</p>
              <p>TimeCircle podrá eliminar sin previo aviso cualquier publicación que, a su criterio, no cumpla estos requisitos o sea inapropiada para la comunidad.</p>
            </Section>

            <Section id="intercambios" title="5. Intercambios (Trades)">
              <p>Un intercambio (Trade) es el acuerdo entre dos usuarios para prestar y recibir un servicio. El flujo estándar es:</p>
              <ol>
                <li><strong>Pending</strong>: El solicitante propone fecha, créditos y condiciones.</li>
                <li><strong>Accepted</strong>: El proveedor acepta el intercambio.</li>
                <li><strong>In Progress</strong>: El servicio está siendo prestado.</li>
                <li><strong>Completed</strong>: Ambas partes confirman la finalización y se ejecuta la transferencia de créditos.</li>
              </ol>
              <p>La cancelación de un intercambio aceptado sin causa justificada podrá afectar negativamente a la reputación del usuario. TimeCircle no media en disputas entre usuarios, pero se reserva el derecho de intervenir en casos de abuso reiterado.</p>
              <Highlight variant="info">
                Los créditos solo se transfieren cuando el intercambio alcanza el estado "Completado". Ninguna parte puede exigir la transferencia en estados anteriores.
              </Highlight>
            </Section>

            <Section id="conducta" title="6. Normas de conducta">
              <p>TimeCircle es una comunidad de vecinos basada en la confianza y el respeto mutuo. Los usuarios se comprometen a:</p>
              <ul>
                <li>Tratar a los demás miembros con respeto y educación en todos los intercambios y mensajes.</li>
                <li>Cumplir con los compromisos adquiridos en los intercambios acordados.</li>
                <li>Valorar honestamente a los demás usuarios tras los intercambios.</li>
                <li>No realizar valoraciones falsas, ni positivas ni negativas, de forma malintencionada.</li>
                <li>No utilizar el sistema de mensajería para enviar spam, publicidad no solicitada o contenido ofensivo.</li>
                <li>Respetar la privacidad de los demás usuarios y no compartir sus datos personales sin su consentimiento.</li>
              </ul>
              <p>El incumplimiento reiterado de estas normas podrá resultar en la suspensión temporal o definitiva de la cuenta.</p>
            </Section>

            <Section id="privacidad" title="7. Privacidad y protección de datos">
              <p>TimeCircle trata los datos personales de sus usuarios de conformidad con el <strong>Reglamento General de Protección de Datos (RGPD)</strong> de la Unión Europea y la legislación española aplicable.</p>
              <p><strong>Datos recogidos:</strong> nombre, correo electrónico, ubicación, foto de perfil (opcional), historial de intercambios y transacciones de créditos.</p>
              <p><strong>Finalidad del tratamiento:</strong> prestación del servicio, comunicaciones relacionadas con la plataforma y mejora de la experiencia de usuario.</p>
              <p><strong>Derechos del usuario:</strong> Puedes ejercer tus derechos de acceso, rectificación, supresión, portabilidad y oposición escribiendo a <strong>privacidad@timecircle.app</strong>.</p>
              <p>Los datos no serán vendidos ni cedidos a terceros con fines comerciales. Se podrán compartir con proveedores de servicios técnicos necesarios para el funcionamiento de la plataforma, bajo acuerdos de confidencialidad.</p>
            </Section>

            <Section id="limitaciones" title="8. Limitación de responsabilidad">
              <p>TimeCircle actúa como plataforma tecnológica de intermediación y <strong>no es parte</strong> en los intercambios realizados entre usuarios. Por tanto:</p>
              <ul>
                <li>No garantiza la calidad, idoneidad o resultado de los servicios intercambiados.</li>
                <li>No se responsabiliza de daños físicos, materiales o económicos derivados de los intercambios.</li>
                <li>No verifica la identidad ni las cualificaciones profesionales de los usuarios.</li>
                <li>No garantiza la disponibilidad ininterrumpida del servicio.</li>
              </ul>
              <p>Los usuarios son los únicos responsables del cumplimiento de la normativa aplicable a los servicios que prestan (licencias profesionales, seguros, normativa fiscal, etc.).</p>
              <p>En ningún caso la responsabilidad total de TimeCircle superará el valor de los créditos presentes en la cuenta del usuario afectado en el momento del incidente.</p>
            </Section>

            <Section id="modificaciones" title="9. Modificaciones de los términos">
              <p>TimeCircle se reserva el derecho a modificar estos términos en cualquier momento. Los cambios relevantes serán notificados a los usuarios registrados mediante:</p>
              <ul>
                <li>Aviso destacado en la plataforma al iniciar sesión.</li>
                <li>Correo electrónico a la dirección registrada.</li>
              </ul>
              <p>El uso continuado de la plataforma tras la notificación de cambios implicará la aceptación de los nuevos términos. Si no estás de acuerdo con los cambios, tienes derecho a eliminar tu cuenta antes de la fecha de entrada en vigor.</p>
            </Section>

            <Section id="contacto" title="10. Contacto y resolución de dudas">
              <p>Para cualquier consulta relacionada con estos términos puedes contactar con nosotros a través de:</p>
              <ul>
                <li>📧 <strong>legal@timecircle.app</strong> — Consultas legales y de privacidad</li>
                <li>📧 <strong>soporte@timecircle.app</strong> — Incidencias y soporte técnico</li>
                <li>Formulario de contacto en <Link to="/contacto" className="text-teal-600 dark:text-teal-400 hover:underline">timecircle.app/contacto</Link></li>
              </ul>
              <p>Tiempo de respuesta habitual: <strong>2–5 días hábiles</strong>.</p>
              <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: '0.85rem' }}>
                Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del usuario consumidor.
              </p>
            </Section>

            {/* Footer del documento */}
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-slate-400 dark:text-slate-500" style={{ fontSize: '0.8rem' }}>
                  © 2026 TimeCircle · Versión 1.0 · Todos los derechos reservados
                </p>
              </div>
              <div className="flex gap-3">
                <Link to="/contacto" className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors" style={{ fontSize: '0.8rem' }}>
                  Contactar
                </Link>
                <Link to="/" className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors" style={{ fontSize: '0.8rem' }}>
                  Volver al inicio
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};

// ── Sub-componentes ───────────────────────────────────────

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="mb-10 scroll-mt-24">
    <h2 className="text-slate-900 dark:text-white mb-4" style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3 }}>
      {title}
    </h2>
    <div className="text-slate-600 dark:text-slate-300 space-y-3" style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
      {children}
    </div>
  </section>
);

const Highlight: React.FC<{ children: React.ReactNode; variant?: 'warning' | 'info' }> = ({ children, variant = 'warning' }) => {
  const colors = variant === 'warning'
    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-300'
    : 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/40 text-teal-900 dark:text-teal-300';
  return (
    <div className={`${colors} border rounded-xl px-4 py-3 my-4`} style={{ fontSize: '0.875rem', fontWeight: 500 }}>
      {children}
    </div>
  );
};
