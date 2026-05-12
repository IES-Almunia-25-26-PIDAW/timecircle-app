import React, { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { Search, Plus, Filter, Clock, Star, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES, Service } from '../data/mockData';

const ServiceCard: React.FC<{ service: Service }> = ({ service }) => {
  const { getUserById, getUserReviews, trades } = useApp();
  const user = getUserById(service.userId);
  const userReviews = getUserReviews(service.userId);
  const completedOnService = trades.filter(t => t.serviceId === service.id && t.status === 'completed').length;
  const cat = CATEGORIES.find(c => c.id === service.category);

  return (
    <Link to={`/services/${service.id}`} className="group block bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-teal-200 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cat?.color || 'bg-gray-100'}`} style={{ fontSize: '1.3rem' }}>
          {cat?.icon || '✨'}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded-full ${service.type === 'offer' ? 'bg-teal-100 text-teal-700' : 'bg-purple-100 text-purple-700'}`} style={{ fontSize: '0.7rem', fontWeight: 600 }}>
            {service.type === 'offer' ? '✋ Oferta' : '🙋 Solicitud'}
          </span>
          <div className="flex items-center gap-1 text-amber-600" style={{ fontWeight: 700 }}>
            <Clock className="w-3.5 h-3.5" />
            <span style={{ fontSize: '0.9rem' }}>{service.credits}h</span>
          </div>
        </div>
      </div>

      {/* Distance / proximity */}
      {service.distanceKm !== undefined && service.distanceKm !== null && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-slate-500" style={{ fontSize: '0.8rem' }}>
            {service.distanceKm} km desde ti
          </div>
          <div>
            <span className={`px-2 py-0.5 rounded-full text-xs ${service.proximity === 'very_close' ? 'bg-green-100 text-green-700' : service.proximity === 'close' ? 'bg-blue-100 text-blue-700' : service.proximity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {service.proximity === 'very_close' ? '🟢 Muy cerca' : service.proximity === 'close' ? '🔵 Cerca' : service.proximity === 'medium' ? '🟡 Medio' : '🔴 Lejos'}
            </span>
          </div>
        </div>
      )}

      <h3 className="text-slate-900 group-hover:text-teal-700 transition-colors mb-1" style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4 }}>
        {service.title}
      </h3>
      <p className="text-slate-500 mb-4 line-clamp-2" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
        {service.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {service.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full" style={{ fontSize: '0.7rem' }}>
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <img src={user?.avatar} alt={user?.name} className="w-7 h-7 rounded-full border border-slate-200" />
          <div>
            <div className="text-slate-700" style={{ fontSize: '0.8rem', fontWeight: 500 }}>{user?.name}</div>
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-slate-400" style={{ fontSize: '0.7rem' }}>{user?.rating} · {userReviews.length} · {completedOnService}/{user?.completedTrades ?? 0} intercambios</span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
      </div>
    </Link>
  );
};

export const Services: React.FC = () => {
  const { services, currentUser } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'offer' | 'request'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const { searchServices, updateProfile } = useApp();
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(currentUser?.searchRadiusKm ?? 25);
  const [myCityOnly, setMyCityOnly] = useState<boolean>(currentUser?.searchMyCityOnly ?? false);

  const filtered = useMemo(() => {
    return services.filter(s => {
      if (s.userId === currentUser?.id) return false;
      if (s.status !== 'active') return false;
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.includes(q));
      }
      return true;
    });
  }, [services, currentUser, search, typeFilter, categoryFilter]);

  const offers = filtered.filter(s => s.type === 'offer');
  const requests = filtered.filter(s => s.type === 'request');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-slate-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Servicios</h1>
          <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>{filtered.length} servicios disponibles en tu comunidad</p>
        </div>
        <Link
          to="/services/new"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl transition-colors self-start"
          style={{ fontSize: '0.875rem' }}
        >
          <Plus className="w-4 h-4" />
          Publicar servicio
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar servicios..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50"
              style={{ fontSize: '0.875rem' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors ${showFilters ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            style={{ fontSize: '0.875rem' }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            {/* Type filter */}
            <div className="flex gap-2 flex-wrap">
              {([['all', 'Todos'], ['offer', '✋ Ofertas'], ['request', '🙋 Solicitudes']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTypeFilter(val)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${typeFilter === val ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${categoryFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                style={{ fontSize: '0.8rem' }}
              >
                Todas
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${categoryFilter === cat.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  style={{ fontSize: '0.8rem' }}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
            {/* Distance & locality filters */}
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-slate-700 mb-1" style={{ fontSize: '0.85rem' }}>Radio máximo (km)</label>
                <input type="number" min={1} value={maxDistanceKm} onChange={e => setMaxDistanceKm(Number(e.target.value || 0))} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50" />
              </div>
              <div className="flex items-center gap-2">
                <input id="myCityOnly" type="checkbox" checked={myCityOnly} onChange={e => setMyCityOnly(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="myCityOnly" className="text-slate-700" style={{ fontSize: '0.9rem' }}>Mostrar solo mi ciudad</label>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => searchServices({ maxDistanceKm, myCityOnly })} className="px-3 py-2 bg-teal-600 text-white rounded-xl">Aplicar filtros</button>
                <button onClick={() => updateProfile({ searchRadiusKm: maxDistanceKm, searchMyCityOnly: myCityOnly })} className="px-3 py-2 border rounded-xl">Guardar como predeterminado</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Categories quick access */}
      {!search && categoryFilter === 'all' && (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`} style={{ fontSize: '1.2rem' }}>
                {cat.icon}
              </div>
              <span className="text-slate-500 text-center" style={{ fontSize: '0.65rem' }}>{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ fontSize: '1rem' }}>No se encontraron servicios</p>
          <p style={{ fontSize: '0.875rem' }}>Prueba con otros filtros o sé el primero en publicar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Offers */}
          {(typeFilter === 'all' || typeFilter === 'offer') && offers.length > 0 && (
            <div>
              <h2 className="text-slate-700 mb-3 flex items-center gap-2" style={{ fontSize: '1rem', fontWeight: 600 }}>
                ✋ Ofertas de servicio
                <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full" style={{ fontSize: '0.75rem' }}>{offers.length}</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {offers.map(s => <ServiceCard key={s.id} service={s} />)}
              </div>
            </div>
          )}

          {/* Requests */}
          {(typeFilter === 'all' || typeFilter === 'request') && requests.length > 0 && (
            <div>
              <h2 className="text-slate-700 mb-3 flex items-center gap-2" style={{ fontSize: '1rem', fontWeight: 600 }}>
                🙋 Solicitudes de ayuda
                <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full" style={{ fontSize: '0.75rem' }}>{requests.length}</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {requests.map(s => <ServiceCard key={s.id} service={s} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
