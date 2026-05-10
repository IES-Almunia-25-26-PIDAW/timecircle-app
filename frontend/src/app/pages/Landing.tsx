import React from 'react';
import { Link } from 'react-router';
import { Clock, Users, Star, ArrowRight, Shield, Heart, Sparkles, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const communityImg = "https://images.unsplash.com/photo-1769837230424-bf083c309ab1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZWlnaGJvcmhvb2QlMjBjb21tdW5pdHklMjB2b2x1bnRlZXJzJTIwb3V0ZG9vcnxlbnwxfHx8fDE3NzI4MDM1MTF8MA&ixlib=rb-4.1.0&q=80&w=1080";

const features = [
  { icon: Clock, title: 'Créditos Horarios', desc: 'Cada hora de ayuda que ofreces = 1 crédito. Úsalos para recibir ayuda de otros vecinos.', color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400' },
  { icon: Users, title: 'Comunidad Local', desc: 'Conecta con vecinos de tu barrio. Construye relaciones genuinas mientras ayudas.', color: 'bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400' },
  { icon: Star, title: 'Sistema de Valoraciones', desc: 'Valoraciones transparentes tras cada intercambio para garantizar confianza.', color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400' },
  { icon: Shield, title: 'Seguro y Transparente', desc: 'Sin dinero real, sin complicaciones. Solo tiempo y buena voluntad entre vecinos.', color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' },
  { icon: Heart, title: 'Solidaridad Real', desc: 'Los más solidarios ganan reconocimiento en el ranking de la comunidad.', color: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' },
  { icon: Sparkles, title: 'Aprende y Enseña', desc: 'Comparte tus habilidades y aprende de otros. Perfecto para todas las edades.', color: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400' },
];

const steps = [
  { num: '01', title: 'Regístrate', desc: 'Crea tu perfil en minutos y únete a la comunidad de tu barrio.' },
  { num: '02', title: 'Publica un Servicio', desc: 'Ofrece tus habilidades o solicita ayuda con algo que necesitas.' },
  { num: '03', title: 'Conecta y Acuerda', desc: 'Habla con tu vecino por el chat y acuerda la fecha y detalles.' },
  { num: '04', title: 'Intercambia Créditos', desc: 'Cuando termines, intercambiad créditos y dejad vuestra valoración.' },
];

const testimonials = [
  { name: 'Ana G.', role: 'Profesora jubilada', text: 'Gracias a TimeCircle pude aprender a usar el ordenador mientras enseñaba inglés. ¡Es mágico!', rating: 5, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana&backgroundColor=b6e3f4' },
  { name: 'Carlos M.', role: 'Electricista', text: 'Al principio era escéptico, pero ahora tengo clases de inglés gratis a cambio de pequeñas reparaciones.', rating: 5, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&backgroundColor=ffdfbf' },
  { name: 'Laura F.', role: 'Fisioterapeuta', text: 'La mejor forma de conocer a tus vecinos y crear comunidad. Lo recomiendo a todo el mundo.', rating: 5, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Laura&backgroundColor=ffd5dc' },
];

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-sm shadow-teal-500/30">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900 dark:text-white" style={{ fontWeight: 700, fontSize: '1.1rem' }}>TimeCircle</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 transition-colors" style={{ fontSize: '0.9rem' }}>
              Iniciar sesión
            </Link>
            <Link to="/register" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm shadow-teal-500/30" style={{ fontSize: '0.9rem' }}>
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="absolute inset-0 dark:opacity-30 opacity-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200/50 dark:border-teal-800/50 px-3 py-1.5 rounded-full mb-6" style={{ fontSize: '0.8rem' }}>
                <Sparkles className="w-3.5 h-3.5" />
                Banco de tiempo comunitario
              </div>
              <h1 className="text-slate-900 dark:text-white mb-6" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.2 }}>
                Tu tiempo vale tanto como{' '}
                <span className="text-teal-600 dark:text-teal-400">el de cualquier vecino</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mb-8" style={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
                Intercambia habilidades y favores con tus vecinos sin dinero de por medio.
                Una hora de ayuda = un crédito. Así de sencillo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl transition-colors shadow-md shadow-teal-500/30"
                  style={{ fontWeight: 600 }}
                >
                  Únete gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 px-6 py-3 rounded-xl transition-colors"
                >
                  Ver demo
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6">
                {[
                  { val: '120+', label: 'Vecinos activos' },
                  { val: '350+', label: 'Intercambios' },
                  { val: '4.8★', label: 'Valoración media' },
                ].map(({ val, label }) => (
                  <div key={label}>
                    <div className="text-slate-900 dark:text-white" style={{ fontWeight: 700, fontSize: '1.2rem' }}>{val}</div>
                    <div className="text-slate-500 dark:text-slate-500" style={{ fontSize: '0.8rem' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                <img src={communityImg} alt="Comunidad" className="w-full h-80 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-900/50 to-transparent" />
              </div>
              {/* Floating cards */}
              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/60 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-slate-900 dark:text-white" style={{ fontWeight: 600, fontSize: '0.875rem' }}>+3 créditos</div>
                  <div className="text-slate-500 dark:text-slate-400" style={{ fontSize: '0.75rem' }}>Por tu clase de cocina</div>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 p-3">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <div className="text-slate-900 dark:text-white" style={{ fontWeight: 600, fontSize: '0.8rem' }}>¡Excelente vecina!</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Features */}
      <section className="py-16 md:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-slate-900 dark:text-white mb-4" style={{ fontSize: '2rem', fontWeight: 700 }}>¿Por qué TimeCircle?</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto" style={{ fontSize: '1rem' }}>
              Una plataforma diseñada para fortalecer los lazos comunitarios y hacer que todos ganemos juntos.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md dark:hover:shadow-slate-900/60 hover:border-teal-200 dark:hover:border-teal-800/50 transition-all">
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-slate-900 dark:text-white mb-2" style={{ fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
                <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-slate-900 dark:text-white mb-4" style={{ fontSize: '2rem', fontWeight: 700 }}>Cómo funciona</h2>
            <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: '1rem' }}>En 4 pasos sencillos</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-teal-500/30" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {num}
                </div>
                <h3 className="text-slate-900 dark:text-white mb-2" style={{ fontWeight: 600 }}>{title}</h3>
                <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-20 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-slate-900 dark:text-white mb-4" style={{ fontSize: '2rem', fontWeight: 700 }}>Lo que dicen nuestros vecinos</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map(({ name, role, text, rating, avatar }) => (
              <div key={name} className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md dark:hover:shadow-slate-900/60 transition-shadow">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-4" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>"{text}"</p>
                <div className="flex items-center gap-3">
                  <img src={avatar} alt={name} className="w-10 h-10 rounded-full border-2 border-teal-100 dark:border-teal-900" />
                  <div>
                    <div className="text-slate-900 dark:text-white" style={{ fontWeight: 600, fontSize: '0.875rem' }}>{name}</div>
                    <div className="text-slate-400 dark:text-slate-500" style={{ fontSize: '0.75rem' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-teal-600 to-teal-800 dark:from-teal-800 dark:to-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
          <h2 className="mb-4" style={{ fontSize: '2rem', fontWeight: 700 }}>Empieza a intercambiar hoy</h2>
          <p className="text-teal-100 dark:text-teal-300 mb-8" style={{ fontSize: '1rem' }}>
            Únete a más de 120 vecinos que ya están compartiendo su tiempo y habilidades.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-700 px-6 py-3 rounded-xl transition-colors shadow-md"
              style={{ fontWeight: 600 }}
            >
              Crear cuenta gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-6 flex justify-center gap-6 text-teal-200 dark:text-teal-400" style={{ fontSize: '0.875rem' }}>
            {['Sin tarjeta de crédito', 'Sin cuotas', 'Sin dinero real'].map(t => (
              <div key={t} className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800 text-slate-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <span className="text-white" style={{ fontWeight: 600 }}>TimeCircle</span>
            <span style={{ fontSize: '0.8rem' }}>Banco de Tiempo Comunitario</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" style={{ fontSize: '0.8rem' }}>
            <Link to="/terminos" className="hover:text-teal-400 transition-colors">
              Términos y condiciones
            </Link>
            <Link to="/contacto" className="hover:text-teal-400 transition-colors">
              Contacto
            </Link>
            <span>© 2026 TimeCircle · Hecho con ❤️ para la comunidad</span>
          </div>
        </div>
      </footer>
    </div>
  );
};