import React, { useState } from 'react';
import { Link } from 'react-router';
import { Star, Clock, ArrowLeftRight, Trophy, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User } from '../data/mockData';

const BADGE_CONFIG = {
  gold: { label: 'Oro', emoji: '🥇', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  silver: { label: 'Plata', emoji: '🥈', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' },
  bronze: { label: 'Bronce', emoji: '🥉', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
};

type SortKey = 'hoursGiven' | 'completedTrades' | 'rating' | 'credits';

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'hoursGiven', label: 'Horas dadas', icon: <Clock className="w-4 h-4" /> },
  { key: 'completedTrades', label: 'Intercambios', icon: <ArrowLeftRight className="w-4 h-4" /> },
  { key: 'rating', label: 'Valoración', icon: <Star className="w-4 h-4" /> },
  { key: 'credits', label: 'Créditos', icon: <TrendingUp className="w-4 h-4" /> },
];

export const Leaderboard: React.FC = () => {
  const { users, currentUser } = useApp();
  const [sortBy, setSortBy] = useState<SortKey>('hoursGiven');

  const ranked = [...users]
    .filter(u => !u.isAdmin)
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const podiumOrder = [1, 0, 2]; // silver, gold, bronze

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-600" />
          </div>
        </div>
        <h1 className="text-slate-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Vecinos más solidarios</h1>
        <p className="text-slate-500 mt-1" style={{ fontSize: '0.875rem' }}>
          Los miembros más activos y solidarios de nuestra comunidad
        </p>
      </div>

      {/* Sort options */}
      <div className="flex gap-2 flex-wrap justify-center">
        {SORT_OPTIONS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
              sortBy === key ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            style={{ fontSize: '0.8rem' }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Podium top 3 */}
      {top3.length >= 2 && (
        <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl p-6 border border-amber-100">
          <div className="flex items-end justify-center gap-4 mb-6">
            {podiumOrder.map(idx => {
              if (idx >= top3.length) return null;
              const user = top3[idx];
              const positions = ['🥇', '🥈', '🥉'];
              const heights = ['h-24', 'h-32', 'h-20'];
              const actualRank = idx + 1;
              const isMe = user.id === currentUser?.id;

              return (
                <div key={user.id} className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className={`w-14 h-14 rounded-full border-4 ${isMe ? 'border-teal-500' : 'border-white'} shadow-md`}
                    />
                    <span className="absolute -bottom-2 -right-2 text-xl">{positions[idx]}</span>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-900" style={{ fontWeight: 600, fontSize: '0.8rem' }}>{user.name.split(' ')[0]}</div>
                    <div className="text-teal-600" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {user[sortBy]}{sortBy === 'hoursGiven' || sortBy === 'credits' ? 'h' : sortBy === 'rating' ? '★' : ''}
                    </div>
                  </div>
                  <div className={`w-24 ${heights[idx === 1 ? 0 : idx === 0 ? 1 : 2]} ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-300' : 'bg-orange-300'} rounded-t-xl flex items-center justify-center`}>
                    <span className="text-white" style={{ fontWeight: 700, fontSize: '1.2rem' }}>#{actualRank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full ranking */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-slate-900" style={{ fontSize: '1rem', fontWeight: 600 }}>Clasificación completa</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {ranked.map((user, index) => {
            const isMe = user.id === currentUser?.id;
            const badgeCfg = user.badge ? BADGE_CONFIG[user.badge] : null;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

            return (
              <Link
                key={user.id}
                to={`/profile/${user.id}`}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${isMe ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
              >
                {/* Rank */}
                <div className="w-8 text-center flex-shrink-0">
                  {medal ? (
                    <span style={{ fontSize: '1.3rem' }}>{medal}</span>
                  ) : (
                    <span className="text-slate-400" style={{ fontWeight: 700, fontSize: '0.875rem' }}>#{index + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border-2 border-slate-100 flex-shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-slate-900 ${isMe ? 'text-teal-700' : ''}`} style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {user.name} {isMe && '(tú)'}
                    </span>
                    {badgeCfg && (
                      <span className={`px-2 py-0.5 rounded-full border ${badgeCfg.bg} ${badgeCfg.border} ${badgeCfg.text}`} style={{ fontSize: '0.65rem', fontWeight: 600 }}>
                        {badgeCfg.emoji} {badgeCfg.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-slate-400" style={{ fontSize: '0.75rem' }}>⭐ {user.rating}</span>
                    <span className="text-slate-400" style={{ fontSize: '0.75rem' }}>↕ {user.completedTrades} intercambios</span>
                  </div>
                </div>

                {/* Primary stat */}
                <div className="text-right flex-shrink-0">
                  <div className="text-teal-600" style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {user[sortBy]}
                    {sortBy === 'hoursGiven' || sortBy === 'credits' ? 'h' : sortBy === 'rating' ? '★' : ''}
                  </div>
                  <div className="text-slate-400" style={{ fontSize: '0.7rem' }}>
                    {SORT_OPTIONS.find(s => s.key === sortBy)?.label}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Achievement badges legend */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-slate-700 mb-4" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Insignias de Solidaridad</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(BADGE_CONFIG).map(([key, cfg]) => (
            <div key={key} className={`${cfg.bg} border ${cfg.border} rounded-xl p-3 text-center`}>
              <div style={{ fontSize: '1.5rem' }}>{cfg.emoji}</div>
              <div className={`${cfg.text} mt-1`} style={{ fontWeight: 600, fontSize: '0.8rem' }}>{cfg.label}</div>
              <div className="text-slate-500 mt-0.5" style={{ fontSize: '0.7rem' }}>
                {key === 'gold' ? '20+ horas dadas' : key === 'silver' ? '10+ horas dadas' : '5+ horas dadas'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
