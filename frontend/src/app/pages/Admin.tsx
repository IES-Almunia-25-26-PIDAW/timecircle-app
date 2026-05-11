import React, { useState } from 'react';
import {
  Users, Search, Trash2, Shield, CheckCircle,
  XCircle, TrendingUp, Star, Clock, ArrowLeftRight,
  AlertTriangle, Eye, Settings
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiAdminGetStats } from '../api/endpoints';
import GeoOverviewMap from '../components/GeoOverviewMap';
import { CATEGORIES } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type AdminTab = 'overview' | 'users' | 'services' | 'trades';

export const Admin: React.FC = () => {
  const { users, services, trades, reviews, adminDeleteUser, adminDeleteService, adminUpdateUser, currentUser, getUserById, getServiceById } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchUsers, setSearchUsers] = useState('');
  const [searchServices, setSearchServices] = useState('');

  if (!currentUser?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Shield className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-slate-700 mb-2" style={{ fontWeight: 600 }}>Acceso restringido</h2>
        <p style={{ fontSize: '0.875rem' }}>Solo los administradores pueden ver esta página</p>
      </div>
    );
  }

  // Stats
  const totalUsers = users.filter(u => !u.isAdmin).length;
  const activeServices = services.filter(s => s.status === 'active').length;
  const completedTrades = trades.filter(t => t.status === 'completed').length;
  const pendingTrades = trades.filter(t => t.status === 'pending').length;

  const filteredUsers = users.filter(u =>
    !u.isAdmin && (
      !searchUsers ||
      u.name.toLowerCase().includes(searchUsers.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUsers.toLowerCase())
    )
  );

  const filteredServices = services.filter(s =>
    !searchServices ||
    s.title.toLowerCase().includes(searchServices.toLowerCase())
  );

  // Category data for chart
  const catData = CATEGORIES.map(cat => ({
    name: cat.label,
    icon: cat.icon,
    count: services.filter(s => s.category === cat.id).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

  const badgeUsers = users.filter(u => u.badge);

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Resumen', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'users', label: `Usuarios (${totalUsers})`, icon: <Users className="w-4 h-4" /> },
    { key: 'services', label: `Servicios (${services.length})`, icon: <Search className="w-4 h-4" /> },
    { key: 'trades', label: `Intercambios (${trades.length})`, icon: <ArrowLeftRight className="w-4 h-4" /> },
  ];

  const assignBadge = (userId: string, badge: 'gold' | 'silver' | 'bronze' | undefined) => {
    adminUpdateUser(userId, { badge });
  };

  const [geoStats, setGeoStats] = useState<{ user_cells: any[]; service_cells: any[] } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await apiAdminGetStats();
        if (!cancelled) setGeoStats(data);
      } catch (e) {
        // ignore
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-slate-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Panel de Administración</h1>
          <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>Gestión de la comunidad TimeCircle</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 flex-wrap">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            style={{ fontSize: '0.875rem', fontWeight: activeTab === key ? 600 : 400 }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Usuarios', val: totalUsers, icon: <Users className="w-5 h-5" />, bg: 'bg-blue-100', color: 'text-blue-600' },
              { label: 'Servicios activos', val: activeServices, icon: <CheckCircle className="w-5 h-5" />, bg: 'bg-teal-100', color: 'text-teal-600' },
              { label: 'Intercambios completados', val: completedTrades, icon: <ArrowLeftRight className="w-5 h-5" />, bg: 'bg-green-100', color: 'text-green-600' },
              { label: 'Intercambios pendientes', val: pendingTrades, icon: <Clock className="w-5 h-5" />, bg: 'bg-amber-100', color: 'text-amber-600' },
            ].map(({ label, val, icon, bg, color }) => (
              <div key={label} className="bg-white border border-slate-100 rounded-2xl p-5">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center ${color} mb-3`}>
                  {icon}
                </div>
                <div className="text-slate-900" style={{ fontWeight: 700, fontSize: '1.8rem' }}>{val}</div>
                <div className="text-slate-500" style={{ fontSize: '0.8rem' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Services by category */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h2 className="text-slate-900 mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>Servicios por categoría</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" name="Servicios" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Geographic overview */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h2 className="text-slate-900 mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>Visión geográfica (agregada)</h2>
            <div style={{ height: 360 }}>
              <GeoOverviewMap
                center={{ lat: 40.4168, lon: -3.7038 }}
                zoom={6}
                userCells={geoStats?.user_cells || []}
                serviceCells={geoStats?.service_cells || []}
                height={360}
              />
            </div>
            <div className="text-slate-500 text-sm mt-2">Zonas aproximadas agregadas para mostrar densidad de usuarios y servicios sin exponer ubicaciones precisas.</div>
          </div>

          {/* Badge holders */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h2 className="text-slate-900 mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>Vecinos con insignia de solidaridad</h2>
            <div className="space-y-3">
              {badgeUsers.length === 0 ? (
                <p className="text-slate-400" style={{ fontSize: '0.875rem' }}>No hay insignias asignadas</p>
              ) : (
                badgeUsers.map(user => {
                  const badge = user.badge ? { gold: '🥇 Oro', silver: '🥈 Plata', bronze: '🥉 Bronce' }[user.badge] : '';
                  return (
                    <div key={user.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <img src={user.avatar} alt="" className="w-9 h-9 rounded-full" />
                      <div className="flex-1">
                        <div className="text-slate-900" style={{ fontWeight: 500, fontSize: '0.875rem' }}>{user.name}</div>
                        <div className="text-slate-400" style={{ fontSize: '0.75rem' }}>{badge}</div>
                      </div>
                      <div className="text-teal-600" style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.hoursGiven}h dadas</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchUsers}
              onChange={e => setSearchUsers(e.target.value)}
              placeholder="Buscar usuario..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
              style={{ fontSize: '0.875rem' }}
            />
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
              <div className="col-span-4">USUARIO</div>
              <div className="col-span-2 text-center">CRÉDITOS</div>
              <div className="col-span-2 text-center">VALORACIÓN</div>
              <div className="col-span-2 text-center">INSIGNIA</div>
              <div className="col-span-2 text-center">ACCIONES</div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <div key={user.id} className="grid grid-cols-12 gap-2 px-5 py-4 items-center hover:bg-slate-50 transition-colors">
                  <div className="col-span-4 flex items-center gap-3">
                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                    <div className="min-w-0">
                      <div className="text-slate-900 truncate" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user.name}</div>
                      <div className="text-slate-400 truncate" style={{ fontSize: '0.75rem' }}>{user.email}</div>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-amber-600" style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.credits}h</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="flex items-center justify-center gap-0.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span style={{ fontSize: '0.875rem' }}>{user.rating}</span>
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <select
                      value={user.badge || ''}
                      onChange={e => assignBadge(user.id, e.target.value as any || undefined)}
                      className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      style={{ fontSize: '0.7rem' }}
                    >
                      <option value="">Sin insignia</option>
                      <option value="bronze">🥉 Bronce</option>
                      <option value="silver">🥈 Plata</option>
                      <option value="gold">🥇 Oro</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex justify-center gap-1">
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar a ${user.name}?`)) {
                          adminDeleteUser(user.id);
                        }
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Services moderation */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchServices}
              onChange={e => setSearchServices(e.target.value)}
              placeholder="Buscar servicio..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
              style={{ fontSize: '0.875rem' }}
            />
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredServices.map(service => {
                const cat = CATEGORIES.find(c => c.id === service.category);
                const user = getUserById(service.userId);
                return (
                  <div key={service.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cat?.color || 'bg-gray-100'} flex-shrink-0`} style={{ fontSize: '1.1rem' }}>
                      {cat?.icon || '✨'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-900 truncate" style={{ fontWeight: 500, fontSize: '0.875rem' }}>{service.title}</div>
                      <div className="flex items-center gap-2 text-slate-400" style={{ fontSize: '0.75rem' }}>
                        <span>{user?.name}</span>
                        <span>·</span>
                        <span className={service.type === 'offer' ? 'text-teal-600' : 'text-purple-600'}>
                          {service.type === 'offer' ? '✋ Oferta' : '🙋 Solicitud'}
                        </span>
                        <span>·</span>
                        <span>{service.credits}h</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full ${service.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`} style={{ fontSize: '0.7rem' }}>
                        {service.status === 'active' ? 'Activo' : 'Pausado'}
                      </span>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar "${service.title}"?`)) {
                            adminDeleteService(service.id);
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Trades overview */}
      {activeTab === 'trades' && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {trades.map(trade => {
              const offerer = getUserById(trade.offererId);
              const requester = getUserById(trade.requesterId);
              const service = getServiceById(trade.serviceId);
              const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
                pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
                accepted: { label: 'Aceptado', className: 'bg-blue-100 text-blue-700' },
                in_progress: { label: 'En curso', className: 'bg-purple-100 text-purple-700' },
                completed: { label: 'Completado', className: 'bg-green-100 text-green-700' },
                cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
              };
              const status = STATUS_CONFIG[trade.status];

              return (
                <div key={trade.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <img src={offerer?.avatar} alt="" className="w-7 h-7 rounded-full" />
                    <span className="text-slate-500 text-xs">→</span>
                    <img src={requester?.avatar} alt="" className="w-7 h-7 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 truncate" style={{ fontWeight: 500, fontSize: '0.875rem' }}>{service?.title}</div>
                    <div className="text-slate-400" style={{ fontSize: '0.75rem' }}>
                      {offerer?.name} → {requester?.name} · {new Date(trade.scheduledDate).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full ${status?.className}`} style={{ fontSize: '0.7rem', fontWeight: 500 }}>
                      {status?.label}
                    </span>
                    <span className="text-amber-600" style={{ fontWeight: 700, fontSize: '0.875rem' }}>{trade.creditsAmount}h</span>
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