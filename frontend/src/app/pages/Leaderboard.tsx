import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
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

// Helper to derive the small suffix/icon shown next to the numeric stat
function statSuffixFor(key: SortKey): string {
  if (key === 'hoursGiven' || key === 'credits') return 'h';
  if (key === 'rating') return '★';
  return '';
}

  const UserRowComponent: React.FC<{
  user: User;
  index: number;
  qs: string;
  currentUser?: User | null;
  sortBy: SortKey;
  primaryStatLabel: string;
}> = ({ user, index, qs, currentUser, sortBy, primaryStatLabel }) => {
  const isMe = user.id === currentUser?.id;
  const badgeCfg = user.badge ? BADGE_CONFIG[user.badge] : null;
  const profileLink = '/profile/' + user.id + (qs ? '?' + qs : '');
  let medalEmoji = '🥉';
  if (index === 0) medalEmoji = '🥇';
  else if (index === 1) medalEmoji = '🥈';

  return (
    <Link
      to={profileLink}
      className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${isMe ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
    >
      <div className="w-8 text-center flex-shrink-0">
        {index < 3 ? (
          <span style={{ fontSize: '1.3rem' }}>{medalEmoji}</span>
        ) : (
          <span className="text-slate-400" style={{ fontWeight: 700, fontSize: '0.875rem' }}>#{index + 1}</span>
        )}
      </div>

      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border-2 border-slate-100 flex-shrink-0" />

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

      <div className="text-right flex-shrink-0">
        <div className="text-teal-600" style={{ fontWeight: 700, fontSize: '1rem' }}>
          {user[sortBy]}{statSuffixFor(sortBy)}
        </div>
        <div className="text-slate-400" style={{ fontSize: '0.7rem' }}>
          {primaryStatLabel}
        </div>
      </div>
    </Link>
  );
};

export const Leaderboard: React.FC = () => {
  const { users, currentUser } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<SortKey>('hoursGiven');
  const [page, setPage] = useState<number>(1);
  const [city, setCity] = useState<string>('all');
  const [country, setCountry] = useState<string>('all');
  const PER_PAGE = 10;

  // Exclude specific countries/cities from lists and results
  const EXCLUDED_COUNTRIES = ['spain'];
  const EXCLUDED_CITIES = ['jerez'];

  // Resetting page is handled in the user interaction handlers
  // (e.g. when clicking sort or changing filters) so we avoid
  // interfering with initialization from URL search params.

  // initialize from URL
  useEffect(() => {
    const s = searchParams.get('sort');
    const p = Number(searchParams.get('page')) || 1;
    const c = searchParams.get('country') || 'all';
    const ci = searchParams.get('city') || 'all';

    if (s && ['hoursGiven', 'completedTrades', 'rating', 'credits'].includes(s)) setSortBy(s as SortKey);
    setPage(p);
    setCountry(c);
    setCity(ci);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync state -> URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (sortBy && sortBy !== 'hoursGiven') params.sort = sortBy;
    if (page && page > 1) params.page = String(page);
    if (country && country !== 'all') params.country = country;
    if (city && city !== 'all') params.city = city;
    setSearchParams(params, { replace: true });
  }, [sortBy, page, country, city, setSearchParams]);

  const ranked = [...users]
    .filter(u => !u.isAdmin)
    .filter(u => !(u.country && EXCLUDED_COUNTRIES.includes(u.country.toLowerCase())))
    .filter(u => !(u.city && EXCLUDED_CITIES.includes(u.city.toLowerCase())))
    .filter(u => country === 'all' ? true : (u.country || '').toLowerCase() === country.toLowerCase())
    .filter(u => city === 'all' ? true : (u.city || '').toLowerCase() === city.toLowerCase())
    .sort((a, b) => b[sortBy] - a[sortBy]);

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  // derive country options from full user list (exclude admins and empty)
  const countries = Array.from(new Set(users.map(u => u.country).filter(Boolean)
    .filter(c => !EXCLUDED_COUNTRIES.includes(c.toLowerCase())))) as string[];
  countries.sort((a, b) => a.localeCompare(b));

  // derive city options from full user list, but scoped to selected country
  const cities = Array.from(new Set(users
    .filter(u => country === 'all' ? true : (u.country || '').toLowerCase() === country.toLowerCase())
    .map(u => u.city)
    .filter(Boolean)
    .filter(c => !EXCLUDED_CITIES.includes(c.toLowerCase())))) as string[];
  cities.sort((a, b) => a.localeCompare(b));
  const totalPages = Math.max(1, Math.ceil(rest.length / PER_PAGE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const paged = rest.slice((currentPage - 1) * PER_PAGE, (currentPage - 1) * PER_PAGE + PER_PAGE);

  const podiumOrder = [1, 0, 2]; // silver, gold, bronze
  const buildQs = (overrides: Record<string,string> = {}) => {
    const qsObj: Record<string,string> = {};
    if (sortBy && sortBy !== 'hoursGiven') qsObj.sort = sortBy;
    if (page && page > 1) qsObj.page = String(page);
    if (country && country !== 'all') qsObj.country = country;
    if (city && city !== 'all') qsObj.city = city;
    Object.assign(qsObj, overrides);
    return new URLSearchParams(qsObj).toString();
  };

  // precompute values used by list rows to simplify render logic
  const qs = buildQs();
  const primaryStatLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label || '';

  

  const renderPodiumItem = (idx: number) => {
    if (idx >= top3.length) return null;
    const user = top3[idx];
    const positions = ['🥇', '🥈', '🥉'];
    const heights = ['h-24', 'h-32', 'h-20'];
    const actualRank = idx + 1;
    const isMe = user.id === currentUser?.id;
    const qs = buildQs();
    const profileLink = '/profile/' + user.id + (qs ? '?' + qs : '');

    // derive height index and background class without nested ternaries
    let heightIdx = 2;
    if (idx === 1) heightIdx = 0;
    else if (idx === 0) heightIdx = 1;
    const heightClass = heights[heightIdx];

    let bgClass = 'bg-orange-300';
    if (idx === 0) bgClass = 'bg-amber-400';
    else if (idx === 1) bgClass = 'bg-slate-300';

    return (
      <Link key={user.id} to={profileLink} className="flex flex-col items-center gap-2">
        <div className="relative">
          <img
            src={user.avatar}
            alt={user.name}
            className={`w-14 h-14 rounded-full border-4 ${isMe ? 'border-teal-500' : 'border-white'} shadow-md`}
          />
          <span className="absolute -bottom-2 -right-2 text-xl">{positions[idx]}</span>
        </div>
        <div className="text-center">
          <div className="text-black" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#000' }}>{user.name.split(' ')[0]}</div>
          <div className="text-teal-600" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            {user[sortBy]}{statSuffixFor(sortBy)}
          </div>
        </div>
        <div className={`w-24 ${heightClass} ${bgClass} rounded-t-xl flex items-center justify-center`}>
          <span className="text-white" style={{ fontWeight: 700, fontSize: '1.2rem' }}>#{actualRank}</span>
        </div>
      </Link>
    );
  };

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
      <div className="flex gap-2 flex-wrap justify-center items-center">
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
        <select
          value={country}
          onChange={e => { setCountry(e.target.value); setCity('all'); }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 bg-white"
        >
          <option value="all">Todos los países</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={city}
          onChange={e => setCity(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 bg-white"
        >
          <option value="all">Todas las ciudades</option>
          {cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Podium top 3 */}
      {top3.length >= 2 && (
        <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl p-6 border border-amber-100">
          <div className="flex items-end justify-center gap-4 mb-6">
            {podiumOrder.map(idx => renderPodiumItem(idx))}
          </div>
        </div>
      )}

      {/* Full ranking */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-slate-900" style={{ fontSize: '1rem', fontWeight: 600 }}>Clasificación completa</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {paged.map((user, idx) => {
            const index = 3 + ((currentPage - 1) * PER_PAGE) + idx; // global index
            return (
              <UserRowComponent
                key={user.id}
                user={user}
                index={index}
                qs={qs}
                currentUser={currentUser}
                sortBy={sortBy}
                primaryStatLabel={primaryStatLabel}
              />
            );
          })}
        </div>

        {/* Pagination controls */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
          <div className="text-sm text-slate-500">Página {currentPage} de {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >Prev</button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`px-3 py-1 rounded-lg ${currentPage === i + 1 ? 'bg-teal-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              >{i + 1}</button>
            ))}
            <button
              className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >Next</button>
          </div>
        </div>
      </div>

      {/* Achievement badges legend */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-slate-700 mb-4" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Insignias de Solidaridad</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(BADGE_CONFIG).map(([key, cfg]) => {
            let badgeDesc = '5+ intercambios';
            if (key === 'gold') badgeDesc = '50+ intercambios';
            else if (key === 'silver') badgeDesc = '20+ intercambios';

            return (
              <div key={key} className={`${cfg.bg} border ${cfg.border} rounded-xl p-3 text-center`}>
                <div style={{ fontSize: '1.5rem' }}>{cfg.emoji}</div>
                <div className={`${cfg.text} mt-1`} style={{ fontWeight: 600, fontSize: '0.8rem' }}>{cfg.label}</div>
                <div className="text-slate-500 mt-0.5" style={{ fontSize: '0.7rem' }}>
                  {badgeDesc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
