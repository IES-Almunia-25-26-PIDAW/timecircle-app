import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  Star, Clock, ArrowLeftRight, MapPin, MessageCircle,
  Pencil, Calendar, Tag, Plus, Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop/types';
import { CATEGORIES } from '../data/mockData';

const STAR_POSITIONS = ['first', 'second', 'third', 'fourth', 'fifth'];

const BADGE_CONFIG = {
  gold:   { label: 'Vecino de Oro',    emoji: '🥇', className: 'bg-amber-100 text-amber-700 border border-amber-300' },
  silver: { label: 'Vecino de Plata',  emoji: '🥈', className: 'bg-slate-100 text-slate-600 border border-slate-300' },
  bronze: { label: 'Vecino de Bronce', emoji: '🥉', className: 'bg-orange-100 text-orange-700 border border-orange-300' },
};

const EditProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, updateProfile, requestLocation } = useApp();
  const [name, setName]         = useState(currentUser?.name || '');
  const [bio, setBio]           = useState(currentUser?.bio || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [city, setCity]         = useState(currentUser?.city || '');
  const [country, setCountry]   = useState(currentUser?.country || '');
  const [streetAddress, setStreetAddress] = useState(currentUser?.streetAddress || '');
  const [postalCode, setPostalCode] = useState(currentUser?.postalCode || '');
  const [shareExactLocation, setShareExactLocation] = useState<boolean>(currentUser?.shareExactLocation ?? false);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(currentUser?.searchRadiusKm ?? 25);
  const [searchMyCityOnly, setSearchMyCityOnly] = useState<boolean>(currentUser?.searchMyCityOnly ?? false);
  const [maxTradeDistanceKm, setMaxTradeDistanceKm] = useState<number>(currentUser?.maxTradeDistanceKm ?? 100);
  const [tradeMyCityOnly, setTradeMyCityOnly] = useState<boolean>(currentUser?.tradeMyCityOnly ?? false);
  const [saving, setSaving]     = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedAreaPixelsRef = useRef<Area | null>(null);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      name, bio, location, city, country,
      streetAddress, postalCode, shareExactLocation,
      searchRadiusKm, searchMyCityOnly,
      maxTradeDistanceKm, tradeMyCityOnly,
      avatarFile,
      removeAvatar,
    });
    setSaving(false);
    onClose();
  };

  const handleFileSelected = (f?: File | null) => {
    if (!f) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    if (!f.type?.startsWith('image/')) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    setAvatarFile(f);
    setRemoveAvatar(false);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
    setShowCropper(true);
  };

  const getSafeImageSrc = (src?: string | null): string => {
    if (!src) return '';
    if (src.startsWith('blob:')) return src;
    if (src.startsWith('data:image/')) return src;
    try {
      const parsed = new URL(src, globalThis.location.origin);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.href;
      }
    } catch {
      return '';
    }
    return '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  };

  useEffect(() => {
    return () => {
      // revoke preview URL on unmount to avoid leaks
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    croppedAreaPixelsRef.current = croppedAreaPixels;
  }, []);

  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });

  const getCroppedImg = useCallback(async (imageSrc: string, pixelCrop: Area) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    return new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9));
  }, []);

  const applyCrop = async () => {
    try {
      if (!avatarPreview || !croppedAreaPixelsRef.current) return;
      const blob = await getCroppedImg(avatarPreview, croppedAreaPixelsRef.current);
      if (!blob) return;
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      // revoke previous preview URL
      URL.revokeObjectURL(avatarPreview);
      const previewUrl = URL.createObjectURL(file);
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
      setShowCropper(false);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } catch (e) {
      console.error('Crop error', e);
    }
  };

  const handleUseBrowserLocation = async () => {
    try {
      await requestLocation();
      // Refresh current user from server to pick up reverse-geocoded city/country
      // Use the global updateProfile to pull latest me via apiGetMe inside it by sending empty payload
      await updateProfile({});
      // Update local fields from updated currentUser
      const me = (await import('../api/endpoints')).apiGetMe;
      const meData = await me();
      if (meData) {
        setCity(meData.city || '');
        setCountry(meData.country || '');
      }
    } catch (e) {
      console.error('Error getting location', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-slate-900 mb-5" style={{ fontSize: '1.1rem', fontWeight: 700 }}>Editar perfil</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Nombre completo</label>
            <input id="edit-name" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50" style={{ fontSize: '0.875rem' }} />
          </div>
          <div>
            <label htmlFor="edit-location" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ubicación</label>
            <input id="edit-location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Tu barrio o ciudad" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50" style={{ fontSize: '0.875rem' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-city" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ciudad (estructurada)</label>
              <input id="edit-city" value={city} onChange={e => setCity(e.target.value)} placeholder="Ciudad" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50" style={{ fontSize: '0.875rem' }} />
            </div>
            <div>
              <label htmlFor="edit-country" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>País</label>
              <input id="edit-country" value={country} onChange={e => setCountry(e.target.value)} placeholder="País" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50" style={{ fontSize: '0.875rem' }} />
            </div>
          </div>

          <div>
            <label htmlFor="edit-street" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Dirección exacta (opcional)</label>
            <input id="edit-street" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} placeholder="Calle, número, piso" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50" style={{ fontSize: '0.875rem' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-postal" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Código postal</label>
              <input id="edit-postal" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="Código postal" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50" style={{ fontSize: '0.875rem' }} />
            </div>
            <div className="flex items-center gap-2">
              <input id="shareExactLocation" type="checkbox" checked={shareExactLocation} onChange={e => setShareExactLocation(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="shareExactLocation" className="text-slate-700" style={{ fontSize: '0.875rem' }}>Compartir mi dirección exacta con otros usuarios</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-search-radius" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Radio de búsqueda (km)</label>
              <input id="edit-search-radius" type="number" min={1} value={searchRadiusKm} onChange={e => setSearchRadiusKm(Number(e.target.value || 0))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50" style={{ fontSize: '0.875rem' }} />
            </div>
            <div className="flex items-center gap-2">
              <input id="searchMyCityOnly" type="checkbox" checked={searchMyCityOnly} onChange={e => setSearchMyCityOnly(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="searchMyCityOnly" className="text-slate-700" style={{ fontSize: '0.875rem' }}>Mostrar solo resultados de mi ciudad</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-max-distance" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Máx. distancia para intercambios (km)</label>
              <input id="edit-max-distance" type="number" min={1} value={maxTradeDistanceKm} onChange={e => setMaxTradeDistanceKm(Number(e.target.value || 0))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50" style={{ fontSize: '0.875rem' }} />
            </div>
            <div className="flex items-center gap-2">
              <input id="tradeMyCityOnly" type="checkbox" checked={tradeMyCityOnly} onChange={e => setTradeMyCityOnly(e.target.checked)} className="w-4 h-4" />
              <label htmlFor="tradeMyCityOnly" className="text-slate-700" style={{ fontSize: '0.875rem' }}>Aceptar intercambios solo en mi ciudad</label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleUseBrowserLocation} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200">Usar mi ubicación actual</button>
            <div className="text-slate-500 text-sm">Esto guardará coordenadas privadas y rellenará ciudad/país si están disponibles.</div>
          </div>
          <div>
            <label htmlFor="edit-avatar" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Foto de perfil</label>
            {showCropper && avatarPreview && (
              <div className="p-3 bg-slate-50 rounded-xl mb-3">
                <div style={{ position: 'relative', width: '100%', height: 320 }}>
                  <Cropper
                    image={avatarPreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
                  <button type="button" onClick={applyCrop} className="px-3 py-2 bg-teal-600 text-white rounded-xl">Recortar y usar</button>
                  <button type="button" onClick={() => setShowCropper(false)} className="px-3 py-2 border rounded-xl">Cancelar</button>
                </div>
              </div>
            )}
            <div className="p-3 border border-dashed rounded-xl flex items-center gap-3">
              <input id="edit-avatar" type="file" accept="image/*" onChange={e => handleFileSelected(e.target.files ? e.target.files[0] : undefined)} className="hidden" />
              <button
                type="button"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                aria-label="Seleccionar o arrastrar foto de perfil"
                onClick={() => document.getElementById('edit-avatar')?.click()}
                className="flex-1 flex items-center gap-3 bg-transparent border-0 p-0"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                  <img src={getSafeImageSrc(avatarPreview || currentUser?.avatar)} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-slate-500 text-sm">Arrastra una imagen o selecciónala. Se redimensionará automáticamente.</div>
                </div>
              </button>
              <div>
                <button type="button" onClick={handleRemoveAvatar} className="text-red-600">Eliminar</button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="edit-bio" className="block text-slate-700 mb-1.5" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Sobre mí</label>
            <textarea id="edit-bio" value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Cuéntanos algo sobre ti..." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 resize-none" style={{ fontSize: '0.875rem' }} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50" style={{ fontSize: '0.875rem' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:opacity-60 flex items-center justify-center gap-2" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, getUserById, getUserReviews, services, getUserTrades, startConversation } = useApp();
  const navigate = useNavigate();
  const [editOpen, setEditOpen]     = useState(false);
  const [activeTab, setActiveTab]   = useState<'services' | 'reviews' | 'stats'>('services');
  const [messaging, setMessaging]   = useState(false);

  const user = getUserById(id);
  if (!user) return (
    <div className="text-center py-20 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
      <p>Cargando perfil...</p>
    </div>
  );

  const isMe         = currentUser?.id === user.id;
  const userServices = services.filter(s => s.userId === user.id && s.status === 'active');
  const userReviews  = getUserReviews(user.id);
  const userTrades   = getUserTrades(user.id);
  const badge        = user.badge ? BADGE_CONFIG[user.badge] : null;

  const handleMessage = async () => {
    if (!currentUser) return;
    setMessaging(true);
    const convId = await startConversation(user.id);
    setMessaging(false);
    if (convId) navigate(`/messages?conv=${convId}`);
  };

  return (
    <>
      {editOpen && <EditProfileModal onClose={() => setEditOpen(false)} />}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile header */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-teal-400 to-teal-600" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-2xl border-4 border-white shadow-sm" />
              <div className="flex gap-2 mt-14">
                {isMe ? (
                  <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors" style={{ fontSize: '0.875rem' }}>
                    <Pencil className="w-4 h-4" />
                    Editar perfil
                  </button>
                ) : (
                  <button onClick={handleMessage} disabled={messaging} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors disabled:opacity-60" style={{ fontSize: '0.875rem' }}>
                    {messaging ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                    Mensaje
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-slate-900" style={{ fontSize: '1.3rem', fontWeight: 700 }}>{user.name}</h1>
                  {badge && (
                    <span className={`px-2 py-0.5 rounded-full text-sm ${badge.className}`} style={{ fontSize: '0.75rem' }}>
                      {badge.emoji} {badge.label}
                    </span>
                  )}
                  {user.isAdmin && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full" style={{ fontSize: '0.75rem' }}>⚙️ Admin</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-slate-500 mt-0.5" style={{ fontSize: '0.875rem' }}>
                  <MapPin className="w-3.5 h-3.5" />
                      {user.location || 'Sin ubicación'}
                      {user.distanceKm !== undefined && user.distanceKm !== null && (
                        <span className="ml-2 text-slate-400" style={{ fontSize: '0.8rem' }}>{user.distanceKm} km desde ti</span>
                      )}
                </div>
                {(user.shareExactLocation || isMe) && user.streetAddress && (
                  <div className="text-slate-500 mt-1" style={{ fontSize: '0.85rem' }}>{user.streetAddress}{user.postalCode ? `, ${user.postalCode}` : ''}</div>
                )}
              </div>
            </div>

            {user.bio && (
              <p className="text-slate-600 mt-3" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{user.bio}</p>
            )}

            {user.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {user.skills.map(skill => (
                  <span key={skill} className="flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-200" style={{ fontSize: '0.8rem' }}>
                    <Tag className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
              {[
                { label: 'Créditos',     val: user.credits,           icon: <Clock className="w-4 h-4 text-amber-500" /> },
                { label: 'Valoración',   val: user.rating > 0 ? `${user.rating.toFixed(1)}★` : '–', icon: <Star className="w-4 h-4 text-purple-500" /> },
                { label: 'Intercambios', val: user.completedTrades,   icon: <ArrowLeftRight className="w-4 h-4 text-teal-500" /> },
                { label: 'Desde',        val: user.memberSince ? new Date(user.memberSince).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }) : '–', icon: <Calendar className="w-4 h-4 text-blue-500" /> },
              ].map(({ label, val, icon }) => (
                <div key={label} className="text-center">
                  <div className="flex justify-center mb-1">{icon}</div>
                  <div className="text-slate-900" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{val}</div>
                  <div className="text-slate-400" style={{ fontSize: '0.7rem' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center">
            <div className="text-teal-700" style={{ fontWeight: 700, fontSize: '1.8rem' }}>{user.hoursGiven}h</div>
            <div className="text-teal-600" style={{ fontSize: '0.8rem' }}>horas dadas a la comunidad</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
            <div className="text-purple-700" style={{ fontWeight: 700, fontSize: '1.8rem' }}>{user.hoursReceived}h</div>
            <div className="text-purple-600" style={{ fontSize: '0.8rem' }}>horas recibidas de la comunidad</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {([
            ['services', `Servicios (${userServices.length})`],
            ['reviews',  `Valoraciones (${userReviews.length})`],
            ['stats',    'Estadísticas'],
          ] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`} style={{ fontSize: '0.875rem', fontWeight: activeTab === tab ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'services' && (
          <div>
            {userServices.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>No hay servicios activos</p>
                {isMe && (
                  <Link to="/services/new" className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 mt-2" style={{ fontSize: '0.875rem' }}>
                    <Plus className="w-4 h-4" />
                    Publicar primer servicio
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {userServices.map(service => {
                  const cat = CATEGORIES.find(c => c.id === service.category);
                  return (
                    <Link key={service.id} to={`/services/${service.id}`} className="flex items-start gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-sm hover:border-teal-200 transition-all">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat?.color || 'bg-gray-100'} flex-shrink-0`} style={{ fontSize: '1.2rem' }}>
                        {cat?.icon || '✨'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-900 truncate" style={{ fontWeight: 600, fontSize: '0.875rem' }}>{service.title}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded-full ${service.type === 'offer' ? 'bg-teal-100 text-teal-700' : 'bg-purple-100 text-purple-700'}`} style={{ fontSize: '0.7rem' }}>
                            {service.type === 'offer' ? 'Oferta' : 'Solicitud'}
                          </span>
                          <span className="text-amber-600" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{service.credits}h</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {userReviews.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No hay valoraciones todavía</div>
            ) : (
              userReviews.map(review => {
                const reviewer = getUserById(review.reviewerId);
                return (
                  <div key={review.id} className="bg-white border border-slate-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={reviewer?.avatar} alt="" className="w-9 h-9 rounded-full" />
                      <div className="flex-1">
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{reviewer?.name || 'Usuario'}</div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={`${review.id}-${STAR_POSITIONS[i]}`} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      <span className="text-slate-400" style={{ fontSize: '0.75rem' }}>
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('es-ES') : ''}
                      </span>
                    </div>
                    <p className="text-slate-600" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>"{review.comment}"</p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Horas dadas',        val: user.hoursGiven,    color: 'text-teal-600',   bg: 'bg-teal-50' },
              { label: 'Horas recibidas',     val: user.hoursReceived, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Intercambios totales',val: userTrades.length,  color: 'text-amber-600',  bg: 'bg-amber-50' },
              { label: 'Valoraciones',        val: userReviews.length, color: 'text-blue-600',   bg: 'bg-blue-50' },
              { label: 'Servicios publicados',val: services.filter(s => s.userId === user.id).length, color: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Balance neto',        val: `${user.hoursGiven - user.hoursReceived >= 0 ? '+' : ''}${user.hoursGiven - user.hoursReceived}h`, color: 'text-green-600', bg: 'bg-green-50' },
            ].map(({ label, val, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-5`}>
                <div className={color} style={{ fontWeight: 700, fontSize: '2rem' }}>{val}</div>
                <div className="text-slate-600" style={{ fontSize: '0.8rem' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
