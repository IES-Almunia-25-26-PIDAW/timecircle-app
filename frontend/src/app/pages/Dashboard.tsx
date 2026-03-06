import React from 'react';
import { Link } from 'react-router';
import {
  Clock, TrendingUp, ArrowLeftRight, Star, Plus,
  ChevronRight, CheckCircle, AlertCircle, Hourglass
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/mockData';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const activityData = [
  { mes: 'Ene', horas: 2 },
  { mes: 'Feb', horas: 4 },
  { mes: 'Mar', horas: 3 },
  { mes: 'Abr', horas: 6 },
  { mes: 'May', horas: 5 },
  { mes: 'Jun', horas: 8 },
];

const TradeStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
    accepted: { label: 'Aceptado', className: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'En curso', className: 'bg-purple-100 text-purple-700' },
    completed: { label: 'Completado', className: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
  };
  const { label, className } = map[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2 py-0.5 rounded-full ${className}`} style={{ fontSize: '0.75rem', fontWeight: 500 }}>{label}</span>;
};

export const Dashboard: React.FC = () => {
  const { currentUser, getUserTrades, services, getServiceById, getUserById, reviews } = useApp();
  if (!currentUser) return null;

  const myTrades = getUserTrades(currentUser.id);
  const activeTrades = myTrades.filter(t => ['pending', 'accepted', 'in_progress'].includes(t.status));
  const recentTrades = myTrades.slice(0, 4);
  const myServices = services.filter(s => s.userId === currentUser.id);
  const recentServices = services.filter(s => s.userId !== currentUser.id && s.status === 'active').slice(0, 4);
  const myReviews = reviews.filter(r => r.revieweeId === currentUser.id).slice(0, 3);

  const badgeConfig = {
    gold: { label: 'Vecino de Oro', className: 'bg-amber-100 text-amber-700 border-amber-300', icon: '🥇' },
    silver: { label: 'Vecino de Plata', className: 'bg-slate-100 text-slate-600 border-slate-300', icon: '🥈' },
    bronze: { label: 'Vecino de Bronce', className: 'bg-orange-100 text-orange-700 border-orange-300', icon: '🥉' },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-slate-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            Hola, {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>
            {currentUser.location} · Miembro desde {new Date(currentUser.memberSince).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link
          to="/services/new"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl transition-colors self-start sm:self-auto"
          style={{ fontSize: '0.875rem' }}
        >
          <Plus className="w-4 h-4" />
          Publicar servicio
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-5 text-white col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Mis Créditos</span>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{currentUser.credits}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>horas disponibles</div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500" style={{ fontSize: '0.8rem' }}>Intercambios</span>
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-slate-900" style={{ fontSize: '2rem', fontWeight: 700 }}>{currentUser.completedTrades}</div>
          <div className="text-slate-400" style={{ fontSize: '0.8rem' }}>completados</div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500" style={{ fontSize: '0.8rem' }}>Valoración</span>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Star className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-slate-900" style={{ fontSize: '2rem', fontWeight: 700 }}>{currentUser.rating > 0 ? currentUser.rating.toFixed(1) : '–'}</div>
          <div className="text-slate-400" style={{ fontSize: '0.8rem' }}>{currentUser.totalReviews} valoraciones</div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500" style={{ fontSize: '0.8rem' }}>Horas Dadas</span>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-slate-900" style={{ fontSize: '2rem', fontWeight: 700 }}>{currentUser.hoursGiven}</div>
          <div className="text-slate-400" style={{ fontSize: '0.8rem' }}>horas de ayuda</div>
        </div>
      </div>

      {/* Badge */}
      {currentUser.badge && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${badgeConfig[currentUser.badge].className}`}>
          <span style={{ fontSize: '1.5rem' }}>{badgeConfig[currentUser.badge].icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{badgeConfig[currentUser.badge].label}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Por tu solidaridad con la comunidad</div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity chart */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900" style={{ fontSize: '1rem', fontWeight: 600 }}>Actividad (horas)</h2>
            <span className="text-teal-600" style={{ fontSize: '0.8rem' }}>Últimos 6 meses</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                labelStyle={{ color: '#475569' }}
              />
              <Area type="monotone" dataKey="horas" stroke="#0d9488" strokeWidth={2} fill="url(#colorHoras)" dot={{ fill: '#0d9488', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Active trades */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900" style={{ fontSize: '1rem', fontWeight: 600 }}>Intercambios activos</h2>
            <Link to="/trades" className="text-teal-600 hover:text-teal-700" style={{ fontSize: '0.8rem' }}>Ver todos</Link>
          </div>
          {activeTrades.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <Hourglass className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p style={{ fontSize: '0.875rem' }}>No hay intercambios activos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrades.slice(0, 3).map(trade => {
                const service = getServiceById(trade.serviceId);
                const other = getUserById(trade.offererId === currentUser.id ? trade.requesterId : trade.offererId);
                return (
                  <div key={trade.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <img src={other?.avatar} alt="" className="w-8 h-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-700 truncate" style={{ fontSize: '0.8rem', fontWeight: 500 }}>{service?.title}</div>
                      <TradeStatusBadge status={trade.status} />
                    </div>
                    <div className="text-amber-600 flex-shrink-0" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{trade.creditsAmount}h</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* My services & Recent services */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* My services */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900" style={{ fontSize: '1rem', fontWeight: 600 }}>Mis servicios</h2>
            <Link to="/services/new" className="text-teal-600 hover:text-teal-700 flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
              <Plus className="w-3.5 h-3.5" />
              Añadir
            </Link>
          </div>
          {myServices.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-400 mb-3" style={{ fontSize: '0.875rem' }}>Aún no has publicado servicios</p>
              <Link to="/services/new" className="inline-flex items-center gap-1 bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 transition-colors" style={{ fontSize: '0.875rem' }}>
                <Plus className="w-4 h-4" />
                Publicar ahora
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {myServices.slice(0, 4).map(service => {
                const cat = CATEGORIES.find(c => c.id === service.category);
                return (
                  <div key={service.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cat?.color || 'bg-gray-100'}`} style={{ fontSize: '1.1rem' }}>
                      {cat?.icon || '✨'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-800 truncate" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{service.title}</div>
                      <div className="text-slate-400" style={{ fontSize: '0.75rem' }}>
                        {service.type === 'offer' ? '✋ Oferta' : '🙋 Solicitud'} · {service.credits}h
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full ${service.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`} style={{ fontSize: '0.7rem' }}>
                      {service.status === 'active' ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent community services */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900" style={{ fontSize: '1rem', fontWeight: 600 }}>Nuevos servicios</h2>
            <Link to="/services" className="text-teal-600 hover:text-teal-700 flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentServices.map(service => {
              const cat = CATEGORIES.find(c => c.id === service.category);
              const user = getUserById(service.userId);
              return (
                <Link key={service.id} to={`/services/${service.id}`} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cat?.color || 'bg-gray-100'}`} style={{ fontSize: '1.1rem' }}>
                    {cat?.icon || '✨'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 truncate group-hover:text-teal-600 transition-colors" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{service.title}</div>
                    <div className="text-slate-400" style={{ fontSize: '0.75rem' }}>
                      {user?.name} · {service.credits}h
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent reviews */}
      {myReviews.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h2 className="text-slate-900 mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>Últimas valoraciones recibidas</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {myReviews.map(review => {
              const reviewer = getUserById(review.reviewerId);
              return (
                <div key={review.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-3" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>"{review.comment}"</p>
                  <div className="flex items-center gap-2">
                    <img src={reviewer?.avatar} alt="" className="w-6 h-6 rounded-full" />
                    <span className="text-slate-500" style={{ fontSize: '0.75rem' }}>{reviewer?.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
