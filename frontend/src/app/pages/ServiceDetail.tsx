import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  Clock, Star, ArrowLeft, MessageCircle, Calendar,
  MapPin, Tag, CheckCircle, AlertCircle, Pencil, Trash2, Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/mockData';

export const ServiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentUser, getServiceById, getUserById, getUserReviews,
    createTrade, startConversation, deleteService,
  } = useApp();

  const [scheduledDate, setScheduledDate] = useState('');
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
  const minDateStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleBook = async () => {
    setBookError('');
    if (!scheduledDate) { setBookError('Por favor selecciona una fecha'); return; }
    if (!isOwner && currentUser && service.type === 'offer' && currentUser.credits < service.credits) {
      setBookError(`No tienes suficientes créditos. Necesitas ${service.credits}h y tienes ${currentUser.credits}h.`);
      return;
    }
    setBooking(true);
    // Validar que la fecha seleccionada sea al menos 1 día desde hoy
    const [y, m, d] = scheduledDate.split('-').map(Number);
    const selected = new Date(y, m - 1, d);
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const minAllowed = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000); // mañana 00:00
    if (selected.getTime() < minAllowed.getTime()) {
      const msg = 'La fecha no puede ser anterior a hoy ni con menos de 1 día de antelación.';
      setBookError(msg);
      setBooking(false);
      return;
    }
    try {
      await createTrade({
        serviceId:     service.id,
        offererId:     service.type === 'offer' ? service.userId : currentUser!.id,
        requesterId:   service.type === 'offer' ? currentUser!.id : service.userId,
        status:        'pending',
        scheduledDate: new Date(scheduledDate).toISOString(),
        creditsAmount: service.credits,
        notes,
      });
      setBooked(true);
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

  const handleDelete = async () => {
    if (window.confirm('¿Eliminar este servicio?')) {
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
                  {owner.completedTrades} intercambios completados
                </div>
              </div>
            )}

            {!isOwner && (
              <div className="space-y-2">
                {!booked ? (
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
                  </>
                ) : (
                  <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl">
                    <CheckCircle className="w-4 h-4" />
                    <span style={{ fontSize: '0.875rem' }}>¡Solicitud enviada!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Booking form */}
          {showBooking && !booked && (
            <div className="bg-white border border-teal-200 rounded-2xl p-5">
              <h3 className="text-slate-700 mb-4" style={{ fontWeight: 600, fontSize: '0.9rem' }}>Selecciona fecha</h3>
              {bookError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-xl mb-3">
                  <AlertCircle className="w-4 h-4" />
                  <span style={{ fontSize: '0.8rem' }}>{bookError}</span>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-600 mb-1" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Fecha propuesta</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={minDateStr}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    style={{ fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1" style={{ fontSize: '0.8rem', fontWeight: 500 }}>Notas (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Detalles adicionales..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    style={{ fontSize: '0.875rem' }}
                  />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2" style={{ fontSize: '0.8rem' }}>
                  <span className="text-amber-700">Se transferirán <strong>{service.credits}h</strong> al completar</span>
                </div>
                <button onClick={handleBook} disabled={booking} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {booking && <Loader2 className="w-4 h-4 animate-spin" />}
                  {booking ? 'Enviando...' : 'Confirmar solicitud'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
