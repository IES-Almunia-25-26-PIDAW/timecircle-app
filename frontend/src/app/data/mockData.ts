// ── TIPOS COMPATIBLES CON LA API REAL ──────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // vacío cuando viene de la API
  avatar: string;
  bio: string;
  location: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  credits: number;
  streetAddress?: string;
  postalCode?: string;
  shareExactLocation?: boolean;
  rating: number;
  totalReviews: number;
  memberSince: string;
  skills: string[];
  badge?: 'gold' | 'silver' | 'bronze';
  completedTrades: number;
  isAdmin?: boolean;
  hoursGiven: number;
  hoursReceived: number;
  // Location & preference fields
  searchRadiusKm?: number;
  searchMyCityOnly?: boolean;
  maxTradeDistanceKm?: number;
  tradeMyCityOnly?: boolean;
}

export interface Service {
  id: string;
  userId: string;
  user?: User;
  type: 'offer' | 'request';
  title: string;
  description: string;
  category: string; // slug de categoría
  duration: number;
  credits: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  tags: string[];
  // Optional location helpers provided by the API when viewer coords are sent
  distanceKm?: number;
  proximity?: 'very_close' | 'close' | 'medium' | 'far';
}

export interface Trade {
  id: string;
  serviceId: string;
  offererId: string;
  requesterId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  creditsAmount: number;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  lastProposedById?: string;
  lastProposedAt?: string;
  conversationId?: string;
  // Optional activity/start/end fields
  startedAt?: string;
  startedById?: string;
  endConfirmations?: string[];
  autoCancelAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType?: 'text' | 'trade_proposal' | 'trade_status';
  trade?: Trade;
  payload?: any;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[]; // IDs de usuarios
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
}

export interface Review {
  id: string;
  tradeId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// ── CATEGORÍAS (mapeadas desde la API) ─────────────────────

export const CATEGORIES = [
  { id: 'hogar',      label: 'Hogar',              icon: '🏠', color: 'bg-blue-100 text-blue-700' },
  { id: 'tecnologia', label: 'Tecnología',          icon: '💻', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'educacion',  label: 'Educación',           icon: '📚', color: 'bg-purple-100 text-purple-700' },
  { id: 'cuidados',   label: 'Salud y Cuidados',    icon: '❤️', color: 'bg-pink-100 text-pink-700' },
  { id: 'transporte', label: 'Transporte',          icon: '🚗', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'cocina',     label: 'Cocina',              icon: '🍳', color: 'bg-orange-100 text-orange-700' },
  { id: 'arte',       label: 'Arte y Creatividad',  icon: '🎨', color: 'bg-rose-100 text-rose-700' },
  { id: 'idiomas',    label: 'Idiomas',             icon: '🗣️', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'bienestar',  label: 'Deporte y Bienestar', icon: '💪', color: 'bg-teal-100 text-teal-700' },
  { id: 'mascotas',   label: 'Mascotas',            icon: '🐾', color: 'bg-green-100 text-green-700' },
  { id: 'eventos',    label: 'Eventos',             icon: '🎉', color: 'bg-amber-100 text-amber-700' },
  { id: 'otros',      label: 'Otros',               icon: '✨', color: 'bg-gray-100 text-gray-700' },
];

// Mapeo nombre API → slug local
export const API_CAT_TO_SLUG: Record<string, string> = {
  'Hogar':              'hogar',
  'Tecnología':         'tecnologia',
  'Educación':          'educacion',
  'Salud y Cuidados':   'cuidados',
  'Transporte':         'transporte',
  'Cocina':             'cocina',
  'Arte y Creatividad': 'arte',
  'Idiomas':            'idiomas',
  'Deporte y Bienestar':'bienestar',
  'Mascotas':           'mascotas',
  'Eventos':            'eventos',
  'Otros':              'otros',
};

// Mapeo slug local → nombre API
export const SLUG_TO_API_CAT: Record<string, string> = {
  'hogar':      'Hogar',
  'tecnologia': 'Tecnología',
  'educacion':  'Educación',
  'cuidados':   'Salud y Cuidados',
  'transporte': 'Transporte',
  'cocina':     'Cocina',
  'arte':       'Arte y Creatividad',
  'idiomas':    'Idiomas',
  'bienestar':  'Deporte y Bienestar',
  'mascotas':   'Mascotas',
  'eventos':    'Eventos',
  'otros':      'Otros',
};

// Tipos vacíos para compatibilidad con imports existentes
export const mockUsers: User[] = [];
export const mockServices: Service[] = [];
export const mockTrades: Trade[] = [];
export const mockMessages: Message[] = [];
export const mockConversations: Conversation[] = [];
export const mockReviews: Review[] = [];
