import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeftRight, Clock, CheckCircle, XCircle, PlayCircle,
  Star, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { canRequestStart } from '../utils/tradeHelpers';
import { Trade } from '../data/mockData';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700', icon: '⏳' },
  accepted: { label: 'Aceptado', className: 'bg-blue-100 text-blue-700', icon: '✅' },
  in_progress: { label: 'En curso', className: 'bg-purple-100 text-purple-700', icon: '🔄' },
  completed: { label: 'Completado', className: 'bg-green-100 text-green-700', icon: '🎉' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700', icon: '❌' },
};

const ReviewModal: React.FC<{
  trade: Trade;
  revieweeId: string;
  onClose: () => void;
}> = ({ trade, revieweeId, onClose }) => {
  const { addReview, currentUser, getUserById } = useApp();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const reviewee = getUserById(revieweeId);

  const handleSubmit = () => {
    if (!currentUser || rating === 0) return;
    if (comment.trim().length < 10) {
      setCommentError('El comentario debe tener al menos 10 caracteres.');
      return;
    }

    addReview({
      tradeId: trade.id,
      reviewerId: currentUser.id,
      revieweeId,
      rating,
      comment: comment.trim(),
    });
    setSubmitted(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        {submitted ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-slate-900" style={{ fontWeight: 600 }}>¡Valoración enviada!</p>
          </div>
        ) : (
          <>
            <h2 className="text-slate-900 mb-2" style={{ fontSize: '1.1rem', fontWeight: 700 }}>Valorar intercambio</h2>
            <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-xl">
              <img src={reviewee?.avatar} alt="" className="w-10 h-10 rounded-full" />
              <div>
                <div className="text-slate-900" style={{ fontWeight: 600, fontSize: '0.9rem' }}>{reviewee?.name}</div>
                <div className="text-slate-500" style={{ fontSize: '0.8rem' }}>¿Cómo fue el intercambio?</div>
              </div>
            </div>

            <div className="mb-4">
              <fieldset className="mb-2">
                <legend className="block text-slate-700" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Puntuación</legend>
                <div className="flex gap-2 mt-2" role="radiogroup" aria-label="Puntuación">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      onMouseEnter={() => setHoveredRating(s)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110"
                      aria-pressed={s <= (hoveredRating || rating)}
                      aria-label={`Puntuación ${s}`}
                    >
                      <Star className={`w-8 h-8 ${s <= (hoveredRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mb-5">
              <label htmlFor="reviewComment" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Comentario</label>
              <textarea
                id="reviewComment"
                value={comment}
                onChange={e => {
                  const nextComment = e.target.value;
                  setComment(nextComment);
                  if (commentError && nextComment.trim().length >= 10) {
                    setCommentError('');
                  }
                }}
                placeholder="Comparte tu experiencia con la comunidad..."
                rows={3}
                className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 resize-none ${
                  commentError
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-slate-200 focus:ring-teal-500'
                }`}
                style={{ fontSize: '0.875rem' }}
                aria-invalid={commentError ? 'true' : 'false'}
                aria-describedby={commentError ? 'review-comment-error' : undefined}
              />
              {commentError && (
                <p id="review-comment-error" className="mt-1.5 text-red-600" style={{ fontSize: '0.8rem' }}>
                  {commentError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                style={{ fontSize: '0.875rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={rating === 0}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                style={{ fontWeight: 600, fontSize: '0.875rem' }}
              >
                Enviar valoración
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TradeCard: React.FC<{ trade: Trade }> = ({ trade }) => {
  const { currentUser, getServiceById, getUserById, updateTrade, reviews,
    requestStart, confirmStart, requestEnd, confirmEnd, showConfirm } = useApp();
  const service = getServiceById(trade.serviceId);
  const other = getUserById(trade.offererId === currentUser?.id ? trade.requesterId : trade.offererId);
  const isOfferer = trade.offererId === currentUser?.id;
  const [expanded, setExpanded] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const config = STATUS_CONFIG[trade.status];

  const hasReview = reviews.some(r => r.tradeId === trade.id && r.reviewerId === currentUser?.id);
  const canReview = trade.status === 'completed' && !hasReview;
  const revieweeId = isOfferer ? trade.requesterId : trade.offererId;

  return (
    <>
      {showReview && <ReviewModal trade={trade} revieweeId={revieweeId} onClose={() => setShowReview(false)} />}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <img src={other?.avatar} alt="" className="w-11 h-11 rounded-full border-2 border-slate-100 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`px-2 py-0.5 rounded-full ${config.className}`} style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                  {config.icon} {config.label}
                </span>
                <span className="text-amber-600" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  <Clock className="w-3.5 h-3.5 inline mr-0.5" />{trade.creditsAmount}h
                </span>
              </div>
              <div className="text-slate-900" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{service?.title}</div>
              <div className="text-slate-500 mt-0.5" style={{ fontSize: '0.8rem' }}>
                {isOfferer ? '⬆️ Ofreces a' : '⬇️ Recibes de'} <strong>{other?.name}</strong>
              </div>
            </div>
            <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500" style={{ fontSize: '0.8rem' }}>
              {new Date(trade.scheduledDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        {expanded && (
          <div className="px-5 pb-4 border-t border-slate-100 pt-4 space-y-3">
            {trade.notes && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-600" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>📝 {trade.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Offerer can accept pending */}
              {trade.status === 'pending' && isOfferer && (
                <>
                  <button
                    onClick={() => updateTrade(trade.id, { status: 'accepted' })}
                    className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-xl transition-colors"
                    style={{ fontSize: '0.8rem' }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Aceptar
                  </button>
                  <button
                    onClick={() => updateTrade(trade.id, { status: 'cancelled' })}
                    className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    style={{ fontSize: '0.8rem' }}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                </>
              )}

              {/* Start progress */}
              {trade.status === 'accepted' && (
                <>
                  {(() => {
                    const chk = canRequestStart(trade);
                    // No start requested yet
                    if (!trade.startedAt) {
                      return (
                        <button
                          onClick={async () => {
                            if (!(await showConfirm('Solicitar inicio de la actividad?'))) return;
                            try { await requestStart(trade.id); } catch (e) { console.error(e); }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${chk.allowed ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-purple-100 text-purple-300 cursor-not-allowed'}`}
                          style={{ fontSize: '0.8rem' }}
                          disabled={!chk.allowed}
                          title={chk.message || undefined}
                          aria-disabled={!chk.allowed}
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Solicitar inicio
                        </button>
                      );
                    }

                    // Start already requested by current user
                    if (trade.startedById === currentUser?.id) {
                      return (
                        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-100 text-purple-400 cursor-default" style={{ fontSize: '0.8rem' }} disabled>
                          <PlayCircle className="w-3.5 h-3.5" />
                          Inicio solicitado
                        </button>
                      );
                    }

                    // Other participant requested => show confirm
                    return (
                      <button
                        onClick={async () => {
                          if (!(await showConfirm('Confirmar inicio solicitado por la otra parte?'))) return;
                          try { await confirmStart(trade.id); } catch (e) { console.error(e); }
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 border border-teal-600 text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
                        style={{ fontSize: '0.8rem' }}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Confirmar inicio
                      </button>
                    );
                  })()}
                </>
              )}

              {/* Complete */}
              {trade.status === 'in_progress' && (
                <>
                  <button
                    onClick={async () => {
                      if (!(await showConfirm('Solicitar finalización de la actividad?'))) return;
                      try { await requestEnd(trade.id); } catch (e) { console.error(e); }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-white hover:bg-yellow-600 rounded-xl transition-colors"
                    style={{ fontSize: '0.8rem' }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Solicitar fin
                  </button>
                  <button
                    onClick={async () => {
                      if (!(await showConfirm('Confirmar finalización solicitada por la otra parte?'))) return;
                      try { await confirmEnd(trade.id); } catch (e) { console.error(e); }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-xl transition-colors"
                    style={{ fontSize: '0.8rem' }}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Confirmar fin
                  </button>
                </>
              )}

              {/* Review */}
              {canReview && (
                <button
                  onClick={() => setShowReview(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-xl transition-colors"
                  style={{ fontSize: '0.8rem' }}
                >
                  <Star className="w-3.5 h-3.5" />
                  Valorar
                </button>
              )}

              {/* Cancel pending (requester) */}
              {trade.status === 'pending' && !isOfferer && (
                <button
                  onClick={() => updateTrade(trade.id, { status: 'cancelled' })}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                  style={{ fontSize: '0.8rem' }}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelar solicitud
                </button>
              )}

              <Link
                to={`/services/${trade.serviceId}`}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                style={{ fontSize: '0.8rem' }}
              >
                Ver servicio
              </Link>

              <Link
                to={`/profile/${other?.id}`}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                style={{ fontSize: '0.8rem' }}
              >
                Ver perfil
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export const Trades: React.FC = () => {
  const { currentUser, getUserTrades } = useApp();
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  if (!currentUser) return null;

  const trades = getUserTrades(currentUser.id);

  const filtered = trades.filter(t => {
    if (activeTab === 'active') return ['pending', 'accepted', 'in_progress'].includes(t.status);
    if (activeTab === 'completed') return ['completed', 'cancelled'].includes(t.status);
    return true;
  });

  const stats = {
    pending: trades.filter(t => t.status === 'pending').length,
    active: trades.filter(t => ['accepted', 'in_progress'].includes(t.status)).length,
    completed: trades.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-slate-900" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Mis Intercambios</h1>
        <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>Gestiona todos tus intercambios de tiempo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pendientes', val: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'En curso', val: stats.active, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Completados', val: stats.completed, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
            <div className={`${color}`} style={{ fontWeight: 700, fontSize: '1.8rem' }}>{val}</div>
            <div className="text-slate-600" style={{ fontSize: '0.75rem' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {([
          ['active', 'Activos'],
          ['completed', 'Completados'],
          ['all', 'Todos'],
        ] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setActiveTab(val)}
            className={`px-4 py-2.5 transition-colors border-b-2 -mb-px ${
              activeTab === val
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            style={{ fontSize: '0.875rem', fontWeight: activeTab === val ? 600 : 400 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Trade list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p style={{ fontSize: '1rem' }}>No hay intercambios aquí</p>
          <Link to="/services" className="text-teal-600 hover:text-teal-700 mt-2 inline-block" style={{ fontSize: '0.875rem' }}>
            Explorar servicios →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(trade => <TradeCard key={trade.id} trade={trade} />)}
        </div>
      )}
    </div>
  );
};
