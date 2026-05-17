import React, { useState } from 'react';
import {
  ArrowUp, ArrowDown, Star,
  TrendingUp, History as HistoryIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CATEGORIES, type Trade } from '../data/mockData';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Aceptado', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'En curso', className: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completado', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
};

const PIE_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

const getLastSixMonthsActivity = (trades: Trade[], userId: string) => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
      dados: 0,
      recibidos: 0,
    };
  });

  const monthByKey = new Map(months.map(month => [month.key, month]));

  trades.forEach(trade => {
    const activityDate = new Date(trade.completedAt || trade.scheduledDate);
    if (Number.isNaN(activityDate.getTime())) return;

    const key = `${activityDate.getFullYear()}-${activityDate.getMonth()}`;
    const month = monthByKey.get(key);
    if (!month) return;

    if (trade.offererId === userId) {
      month.dados += trade.creditsAmount;
    } else if (trade.requesterId === userId) {
      month.recibidos += trade.creditsAmount;
    }
  });

  return months;
};

export const History: React.FC = () => {
  const { currentUser, getUserTrades, getServiceById, getUserById, getUserReviews } = useApp();
  const [filter, setFilter] = useState<'all' | 'given' | 'received'>('all');

  if (!currentUser) return null;

  const trades = getUserTrades(currentUser.id);
  const reviews = getUserReviews(currentUser.id);

  const filtered = trades.filter(t => {
    if (filter === 'given') return t.offererId === currentUser.id;
    if (filter === 'received') return t.requesterId === currentUser.id;
    return true;
  });

  // Stats
  const completedTrades = trades.filter(t => t.status === 'completed');
  const totalHoursGiven = completedTrades
    .filter(t => t.offererId === currentUser.id)
    .reduce((acc, t) => acc + t.creditsAmount, 0);
  const totalHoursReceived = completedTrades
    .filter(t => t.requesterId === currentUser.id)
    .reduce((acc, t) => acc + t.creditsAmount, 0);
  const monthlyData = getLastSixMonthsActivity(completedTrades, currentUser.id);

  // Category distribution
  const catData = CATEGORIES.map(cat => {
    const count = completedTrades.filter(t => {
      const s = getServiceById(t.serviceId);
      return s?.category === cat.id;
    }).length;
    return { name: cat.label, value: count, icon: cat.icon };
  }).filter(d => d.value > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-slate-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Mi Historial</h1>
        <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>Seguimiento completo de tu actividad en TimeCircle</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total intercambios', val: completedTrades.length, color: 'text-teal-600', bg: 'bg-teal-50', icon: '↕️' },
          { label: 'Horas dadas', val: `${totalHoursGiven}h`, color: 'text-green-600', bg: 'bg-green-50', icon: '⬆️' },
          { label: 'Horas recibidas', val: `${totalHoursReceived}h`, color: 'text-purple-600', bg: 'bg-purple-50', icon: '⬇️' },
          { label: 'Balance neto', val: `${totalHoursGiven - totalHoursReceived >= 0 ? '+' : ''}${totalHoursGiven - totalHoursReceived}h`, color: (totalHoursGiven - totalHoursReceived) >= 0 ? 'text-green-600' : 'text-red-600', bg: 'bg-slate-50', icon: '⚖️' },
        ].map(({ label, val, color, bg, icon }) => (
          <div key={label} className={`${bg} rounded-2xl p-5`}>
            <div style={{ fontSize: '1.5rem' }} className="mb-1">{icon}</div>
            <div className={`${color}`} style={{ fontWeight: 700, fontSize: '1.5rem' }}>{val}</div>
            <div className="text-slate-600" style={{ fontSize: '0.75rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly activity */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h2 className="text-slate-900 mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>Actividad mensual (horas)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} barGap={2}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="dados" name="Horas dadas" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recibidos" name="Horas recibidas" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category distribution */}
        {catData.length > 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h2 className="text-slate-900 mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>Por categoría</h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={catData}
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ fontSize: 10 }}
                >
                  {catData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} intercambios`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p style={{ fontSize: '0.875rem' }}>Completa intercambios para ver estadísticas</p>
            </div>
          </div>
        )}
      </div>

      {/* Reviews received */}
      {reviews.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h2 className="text-slate-900 mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>
            Valoraciones recibidas ({reviews.length})
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.slice(0, 6).map(review => {
              const reviewer = getUserById(review.reviewerId);
              return (
                <div key={review.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={reviewer?.avatar} alt="" className="w-7 h-7 rounded-full" />
                    <div>
                      <div className="text-slate-700" style={{ fontWeight: 500, fontSize: '0.8rem' }}>{reviewer?.name}</div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-slate-500" style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>"{review.comment}"</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trade history table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <h2 className="text-slate-900" style={{ fontSize: '1rem', fontWeight: 600 }}>Historial de intercambios</h2>
          <div className="flex gap-2">
            {([
              ['all', 'Todos'],
              ['given', '⬆️ Dados'],
              ['received', '⬇️ Recibidos'],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${filter === val ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                style={{ fontSize: '0.75rem' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <HistoryIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p style={{ fontSize: '0.875rem' }}>No hay intercambios en esta categoría</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(trade => {
              const service = getServiceById(trade.serviceId);
              const other = getUserById(trade.offererId === currentUser.id ? trade.requesterId : trade.offererId);
              const isGiving = trade.offererId === currentUser.id;
              const status = STATUS_LABELS[trade.status];

              return (
                <div key={trade.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isGiving ? 'bg-green-100' : 'bg-purple-100'}`}>
                    {isGiving
                      ? <ArrowUp className="w-4 h-4 text-green-600" />
                      : <ArrowDown className="w-4 h-4 text-purple-600" />
                    }
                  </div>
                  <img src={other?.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 truncate" style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                      {service?.title}
                    </div>
                    <div className="text-slate-400" style={{ fontSize: '0.75rem' }}>
                      {isGiving ? 'A' : 'De'} {other?.name} · {new Date(trade.scheduledDate).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full ${status?.className || 'bg-gray-100 text-gray-500'}`} style={{ fontSize: '0.7rem', fontWeight: 500 }}>
                      {status?.label}
                    </span>
                    <span className={`flex items-center gap-0.5 ${isGiving ? 'text-green-600' : 'text-purple-600'}`} style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {isGiving ? '+' : '-'}{trade.creditsAmount}h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
