import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  Star, ArrowLeft, MessageCircle, Calendar,
  MapPin, Tag, CheckCircle, AlertCircle, Trash2, Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/mockData';
import ProfileMap from '../components/ProfileMap';
import { canRequestStart } from '../utils/tradeHelpers';

// Helpers extracted to reduce cognitive complexity in the component
const parseSelected = (dateStr: string, timeStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
};

const isOverlap = (selected: Date, selectedEnd: Date, myTrades: any[], getServiceById: (id: string) => any) => {
  for (const t of myTrades) {
    if (!t.scheduledDate) continue;
    if (!['pending','accepted','in_progress'].includes(t.status)) continue;
    const otherStart = new Date(t.scheduledDate);
    const otherService = getServiceById(t.serviceId);
    const otherDuration = otherService?.duration || 0;
    const otherEnd = new Date(otherStart.getTime() + otherDuration * 60000);
    if (selected.getTime() < otherEnd.getTime() && otherStart.getTime() < selectedEnd.getTime()) return true;
  }
  return false;
};

const validateBookingParams = (
  scheduledDate: string,
  scheduledTime: string,
  creditsAmount: number | '',
  service: any,
  currentUser: any,
  trades: any[],
  getServiceById: (id: string) => any,
) => {
  if (!scheduledDate) return { error: 'Por favor selecciona una fecha' };
  if (!scheduledTime) return { error: 'Por favor selecciona una hora' };
  const proposedCredits = Number(creditsAmount || service.credits);
  if (!Number.isFinite(proposedCredits) || proposedCredits < 1) return { error: 'Los créditos propuestos deben ser al menos 1.' };
  if (!currentUser?.isAdmin && service.type === 'offer' && currentUser && currentUser.credits < proposedCredits) {
    return { error: `No tienes suficientes créditos. Necesitas ${proposedCredits}h y tienes ${currentUser.credits}h.` };
  }
  const myTrades = trades.filter(t => (t.requesterId === currentUser?.id || t.offererId === currentUser?.id));
  const sameService = myTrades.find(t => t.serviceId === service.id && ['pending','accepted','in_progress'].includes(t.status));
  if (sameService) return { error: 'Ya tienes una reserva activa para este servicio.' };

  const selected = parseSelected(scheduledDate, scheduledTime);
  const selectedEnd = new Date(selected.getTime() + (service.duration || 0) * 60000);
  if (isOverlap(selected, selectedEnd, myTrades, getServiceById)) return { error: 'Tienes otra cita que se solapa en ese horario. Elige otra hora o fecha.' };
  return { proposedCredits };
};

const BookingForm: React.FC<{
  scheduledDate: string;
  scheduledTime: string;
  setScheduledDate: (v: string) => void;
  setScheduledTime: (v: string) => void;
  creditsAmount: number | '';
  setCreditsAmount: (v: number | '') => void;
  notes: string;
  setNotes: (v: string) => void;
  minDateStr: string;
  bookError: string;
  booking: boolean;
  onConfirm: () => void;
  service: any;
}> = ({ scheduledDate, scheduledTime, setScheduledDate, setScheduledTime, creditsAmount, setCreditsAmount, notes, setNotes, minDateStr, bookError, booking, onConfirm, service }) => (
  <div className="bg-white border border-teal-200 rounded-2xl p-5">
    <h3 className="text-slate-700 mb-4" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Propuesta de reserva</h3>
    {bookError && (
      <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-xl mb-3">
        <AlertCircle className="w-4 h-4" />
        <span style={{ fontSize: '0.8rem' }}>{bookError}</span>
      </div>
    )}
    <div className="space-y-3">
      <div>
        <label htmlFor="booking-date" className="block text-slate-600 mb-1" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Fecha propuesta</label>
        <input id="booking-date" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} min={minDateStr} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ fontSize: '0.875rem' }} />
      </div>
      <div>
        <label htmlFor="booking-time" className="block text-slate-600 mb-1" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Hora propuesta</label>
        <input id="booking-time" type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ fontSize: '0.875rem' }} />
      </div>
      <div>
        <label htmlFor="booking-credits" className="block text-slate-600 mb-1" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Créditos propuestos</label>
        <input id="booking-credits" type="number" min={1} max={20} value={creditsAmount === '' ? service.credits : creditsAmount} onChange={e => setCreditsAmount(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" style={{ fontSize: '0.875rem' }} />
      </div>
      <div>
        <label htmlFor="booking-notes" className="block text-slate-600 mb-1" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Mensaje y notas (opcional)</label>
        <textarea id="booking-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalles adicionales..." rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" style={{ fontSize: '0.875rem' }} />
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2" style={{ fontSize: '0.8rem' }}>
        <span className="text-amber-700">La otra persona podrá aceptar, cancelar o negociar esta propuesta.</span>
      </div>
      <button onClick={onConfirm} disabled={booking} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
        {booking && <Loader2 className="w-4 h-4 animate-spin" />}
        {booking ? 'Enviando...' : 'Confirmar solicitud'}
      </button>
    </div>
  </div>
);

const ActiveTradeActions: React.FC<{
  myActiveTrade: any;
  currentUser: any;
  handleRequestStart: () => void;
  handleConfirmStart: () => void;
  handleRequestEnd: () => void;
  handleConfirmEnd: () => void;
}> = ({ myActiveTrade, currentUser, handleRequestStart, handleConfirmStart, handleRequestEnd, handleConfirmEnd }) => {
  if (!myActiveTrade) return null;
  if (myActiveTrade.status === 'accepted') {
    const chk = canRequestStart(myActiveTrade);
    if (!myActiveTrade.startedAt) {
      return (
        <button onClick={handleRequestStart} className={`flex-1 py-2 rounded-xl ${chk.allowed ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-300 cursor-not-allowed'}`} disabled={!chk.allowed} title={chk.message || undefined} aria-disabled={!chk.allowed}>Solicitar inicio</button>
      );
    }
    if (myActiveTrade.startedById === currentUser?.id) {
      return (
        <button className="flex-1 py-2 rounded-xl bg-purple-100 text-purple-400 cursor-default" disabled>Inicio solicitado</button>
      );
    }
    return (
      <button onClick={handleConfirmStart} className="flex-1 py-2 border border-teal-600 text-teal-600 rounded-xl">Confirmar inicio</button>
    );
  }
  if (myActiveTrade.status === 'in_progress') {
    return (
      <>
        <button onClick={handleRequestEnd} className="flex-1 py-2 bg-yellow-500 text-white rounded-xl">Solicitar fin</button>
        <button onClick={handleConfirmEnd} className="flex-1 py-2 bg-green-600 text-white rounded-xl">Confirmar fin</button>
      </>
    );
  }
  return null;
};

export { parseSelected, isOverlap, validateBookingParams, BookingForm, ActiveTradeActions };

export const ServiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentUser, getServiceById, getUserById, getUserReviews,
    createTrade, startConversation, deleteService, trades,
    requestStart, confirmStart, requestEnd, confirmEnd, showConfirm,
  } = useApp();

  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [creditsAmount, setCreditsAmount] = useState<number | ''>('');
  const [notes, setNotes]                 = useState('');
  const [showBooking, setShowBooking]     = useState(false);
  const [booked, setBooked]               = useState(false);
  const [bookError, setBookError]         = useState('');
  const [booking, setBooking]             = useState(false);
  const [messaging, setMessaging]         = useState(false);

  const service = getServiceById(id!);
  if (!service) return (
    <div className="text-center py-20 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
      <p>Cargando servicio...</p>
      <Link to="/services" className="text-teal-600 hover:underline mt-2 inline-block">Volver a servicios</Link>
    </div>
  );

  const owner        = getUserById(service.userId);
  const ownerReviews = getUserReviews(service.userId);
  const cat          = CATEGORIES.find(c => c.id === service.category);
  const isOwner      = currentUser?.id === service.userId;
  const completedOnService = trades.filter(t => t.serviceId === service.id && t.status === 'completed').length;
  const ownerLat = owner?.latitude ?? null;
  const ownerLon = owner?.longitude ?? null;
  const canShowExact = owner && (owner.shareExactLocation || (currentUser && currentUser.id === owner.id) || currentUser?.isAdmin);
  const hasExactLocation = canShowExact && Number.isFinite(ownerLat) && Number.isFinite(ownerLon);
  const minDateStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  // Use the extracted validateBookingParams helper
  const validateBooking = () => validateBookingParams(scheduledDate, scheduledTime, creditsAmount, service, currentUser, trades, getServiceById);

  // derive owner location string without nested ternaries
  let ownerLocation = 'Ubicación no disponible';
  if (owner?.city) {
    ownerLocation = owner.city + (owner.country ? ', ' + owner.country : '');
  }

  const handleBook = async () => {
    setBookError('');
    try {
      const v = validateBooking();
      if ((v as any).error) { setBookError((v as any).error); return; }
      const proposedCredits = (v as any).proposedCredits as number;

      const selected2 = parseSelected(scheduledDate, scheduledTime);
      const todayMidnight = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      const minAllowed = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);
      if (selected2.getTime() < minAllowed.getTime()) { setBookError('La fecha no puede ser anterior a hoy ni con menos de 1 día de antelación.'); return; }

      setBooking(true);
      const result = await createTrade({
        serviceId:     service.id,
        offererId:     service.type === 'offer' ? service.userId : currentUser!.id,
        requesterId:   service.type === 'offer' ? currentUser!.id : service.userId,
        status:        'pending',
        scheduledDate: selected2.toISOString(),
        creditsAmount: proposedCredits,
        notes,
      });
      setBooked(true);
      if (result?.conversationId) navigate(`/messages?conv=${result.conversationId}`);
    } catch (e: any) {
      const errMsg = e?.detail || e?.non_field_errors?.[0] || e?.message || 'Error al crear el intercambio';
      setBookError(errMsg);
    } finally {
      setBooking(false);
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !owner) return;
    setMessaging(true);
    const convId = await startConversation(owner.id);
    setMessaging(false);
    if (convId) navigate(`/messages?conv=${convId}`);
  };

  // Trade actions for this service (if current user is participant)
  const myActiveTrade = trades.find(t => t.serviceId === service.id && ['accepted', 'in_progress'].includes(t.status) && (t.offererId === currentUser?.id || t.requesterId === currentUser?.id));

  const handleRequestStart = async () => {
    if (!(await showConfirm('Solicitar inicio de la actividad?'))) return;
    try { await requestStart(myActiveTrade!.id); } catch (e) { console.error(e); }
  };
  const handleConfirmStart = async () => {
    if (!(await showConfirm('Confirmar inicio solicitado por la otra parte?'))) return;
    try { await confirmStart(myActiveTrade!.id); } catch (e) { console.error(e); }
  };
  const handleRequestEnd = async () => {
    if (!(await showConfirm('Solicitar finalización de la actividad?'))) return;
    try { await requestEnd(myActiveTrade!.id); } catch (e) { console.error(e); }
  };
  const handleConfirmEnd = async () => {
    if (!(await showConfirm('Confirmar finalización solicitada por la otra parte?'))) return;
    try { await confirmEnd(myActiveTrade!.id); } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (await showConfirm('¿Eliminar este servicio?')) {
      await deleteService(service.id);
      navigate('/services');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/services" className="flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-6 transition-colors" style={{ fontSize: '0.875rem' }}>
        <ArrowLeft className="w-4 h-4" />
        Volver a servicios
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-100 rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cat?.color || 'bg-gray-100'} flex-shrink-0`} style={{ fontSize: '1.8rem' }}>
                {cat?.icon || '✨'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full ${service.type === 'offer' ? 'bg-teal-100 text-teal-700' : 'bg-purple-100 text-purple-700'}`} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {service.type === 'offer' ? '✋ Oferta' : '🙋 Solicitud'}
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full" style={{ fontSize: '0.75rem' }}>
                    {cat?.label || 'Otros'}
                  </span>
                </div>
                <h1 className="text-slate-900" style={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.3 }}>{service.title}</h1>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <div className="text-amber-600" style={{ fontWeight: 700, fontSize: '1.4rem' }}>{service.credits}h</div>
                <div className="text-amber-700" style={{ fontSize: '0.75rem' }}>créditos horarios</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-slate-700" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{service.duration} min</div>
                <div className="text-slate-500" style={{ fontSize: '0.75rem' }}>duración estimada</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className={`px-2 py-0.5 inline-block rounded-full ${service.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {service.status === 'active' ? '● Activo' : '● Pausado'}
                </div>
                <div className="text-slate-500 mt-0.5" style={{ fontSize: '0.75rem' }}>estado</div>
              </div>
            </div>

            {service.description && (
              <div className="mb-5">
                <h3 className="text-slate-700 mb-2" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Descripción</h3>
                <p className="text-slate-600" style={{ lineHeight: 1.7, fontSize: '0.9rem' }}>{service.description}</p>
              </div>
            )}

            {service.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {service.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full" style={{ fontSize: '0.8rem' }}>
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Wider provider map (moved to main for more horizontal space) */}
            {(hasExactLocation || owner?.city) && (
              <div className="mb-5">
                <h3 className="text-slate-700 mb-2" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ubicación del proveedor</h3>
                <div style={{ height: 320, width: '100%' }}>
                  <ProfileMap lat={Number(ownerLat)} lon={Number(ownerLon)} zoom={12} />
                </div>
                <div className="text-slate-500 text-sm mt-2">Se muestra la ubicación guardada en el perfil del proveedor.</div>
              </div>
            )}

                    {isOwner && (
              <div className="mt-5 pt-5 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  style={{ fontSize: '0.875rem' }}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
                    )}
          </div>

            {/* Distance indicator for the service (if available) */}
            {service.distanceKm !== undefined && (
              <div className="mb-4">
                <div className="text-slate-600" style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                  {service.distanceKm} km desde ti
                </div>
              </div>
            )}

          {/* Reviews */}
          {ownerReviews.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6">
              <h2 className="text-slate-900 mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>
                Valoraciones de {owner?.name?.split(' ')[0]}
              </h2>
              <div className="space-y-4">
                {ownerReviews.slice(0, 5).map(review => {
                  const reviewer = getUserById(review.reviewerId);
                  return (
                    <div key={review.id} className="pb-4 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3 mb-2">
                        <img src={reviewer?.avatar} alt="" className="w-8 h-8 rounded-full" />
                        <div>
                          <div className="text-slate-700" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{reviewer?.name || 'Usuario'}</div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                        <span className="ml-auto text-slate-400" style={{ fontSize: '0.75rem' }}>
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString('es-ES') : ''}
                        </span>
                      </div>
                      <p className="text-slate-600" style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>"{review.comment}"</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) || (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center">
              <h4 className="text-slate-900 mb-4" style={{ fontSize: '1rem', fontWeight: 600 }}>Sin valoraciones</h4>
              <p className="text-slate-700" style={{ fontSize: '0.8rem' }}>
                Aún no hay valoraciones para este proveedor. ¡Sé el primero!
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Owner card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="text-slate-700 mb-4" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {service.type === 'offer' ? 'Ofrecido por' : 'Solicitado por'}
            </h3>
            {owner && (
              <Link to={`/profile/${owner.id}`} className="flex items-center gap-3 mb-4 hover:bg-slate-50 rounded-xl p-2 -mx-2 transition-colors">
                <img src={owner.avatar} alt={owner.name} className="w-12 h-12 rounded-full border-2 border-teal-100" />
                <div>
                  <div className="text-slate-900" style={{ fontWeight: 600 }}>{owner.name}</div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-slate-600" style={{ fontSize: '0.8rem' }}>{owner.rating.toFixed(1)} ({owner.totalReviews})</span>
                  </div>
                </div>
              </Link>
            )}

            {owner && (
              <div className="space-y-2 text-slate-500 mb-4" style={{ fontSize: '0.8rem' }}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {owner.location || 'Sin ubicación'}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <div className="text-slate-600" style={{ fontSize: '0.8rem' }}>
                    {completedOnService + ' ' + (completedOnService === 1 ? 'intercambio' : 'intercambios')} · {owner.completedTrades} en total
                  </div>
                </div>
              </div>
            )}

            {/* Provider location from the profile (not viewer live location) */}
            <div className="bg-white border border-slate-100 rounded-2xl p-3">
              <h4 className="text-slate-700 mb-2" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ubicación del proveedor</h4>
              <div className="text-slate-500 text-sm mt-2">{ownerLocation}</div>
            </div>

            {!isOwner && (
              <div className="space-y-2">
                {booked ? (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl">
                    <CheckCircle className="w-4 h-4" />
                    <span style={{ fontSize: '0.875rem' }}>¡Solicitud enviada!</span>
                  </div>
                ) : (
                  <>
                    {service.status === 'active' && (
                      <button onClick={() => setShowBooking(!showBooking)} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        <Calendar className="w-4 h-4 inline mr-1.5" />
                        {service.type === 'offer' ? 'Reservar servicio' : 'Ofrecer ayuda'}
                      </button>
                    )}
                    <button onClick={handleMessage} disabled={messaging} className="w-full py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2" style={{ fontSize: '0.875rem' }}>
                      {messaging ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                      Enviar mensaje
                    </button>
                    {myActiveTrade && (
                      <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="text-slate-700 mb-2" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Estado de tu reserva: {myActiveTrade.status}</div>
                        <div className="flex gap-2">
                          <ActiveTradeActions
                            myActiveTrade={myActiveTrade}
                            currentUser={currentUser}
                            handleRequestStart={handleRequestStart}
                            handleConfirmStart={handleConfirmStart}
                            handleRequestEnd={handleRequestEnd}
                            handleConfirmEnd={handleConfirmEnd}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Booking form */}
          {showBooking && !booked && (
            <BookingForm
              scheduledDate={scheduledDate}
              scheduledTime={scheduledTime}
              setScheduledDate={setScheduledDate}
              setScheduledTime={setScheduledTime}
              creditsAmount={creditsAmount}
              setCreditsAmount={setCreditsAmount}
              notes={notes}
              setNotes={setNotes}
              minDateStr={minDateStr}
              bookError={bookError}
              booking={booking}
              onConfirm={handleBook}
              service={service}
            />
          )}
        </div>
      </div>
    </div>
  );
};
