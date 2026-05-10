import React, {
  createContext, useContext, useState, useCallback, useEffect, useRef,
} from 'react';
import {
  User, Service, Trade, Message, Conversation, Review,
  API_CAT_TO_SLUG, SLUG_TO_API_CAT,
} from '../data/mockData';
import {
  apiLogin, apiLogout, apiRegister, apiGetMe, apiUpdateMe,
  apiGetUsers, apiGetUser,
  apiGetCategories,
  apiGetServices, apiCreateService, apiUpdateService, apiDeleteService,
  apiGetTrades, apiCreateTrade, apiUpdateTradeStatus, apiNegotiateTrade,
  apiGetConversations, apiGetConversation, apiCreateConversation,
  apiSendMessage, apiMarkConversationRead,
  apiGetReviews, apiCreateReview,
  apiAdminGetUsers, apiAdminUpdateUser, apiAdminDeleteUser,
} from '../api/endpoints';
import { clearTokens, getTokens, apiFetch, getWsUrl } from '../api/client';
import { createWS } from '../api/wsClient';
import { apiGetWSPresenceHandshake } from '../api/endpoints';

// ── MAPPERS API → UI ─────────────────────────────────────────

const mapUser = (u: any): User => ({
  id: String(u.id),
  name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
  email: u.email || '',
  password: '',
  avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}&backgroundColor=b6e3f4`,
  bio: u.bio || '',
  location: u.location || '',
  city: u.city || '',
  country: u.country || '',
  latitude: u.latitude !== undefined && u.latitude !== null ? Number(u.latitude) : undefined,
  longitude: u.longitude !== undefined && u.longitude !== null ? Number(u.longitude) : undefined,
  distanceKm: u.distance_km ?? undefined,
  credits: u.credits ?? 0,
  rating: parseFloat(u.rating) || 0,
  totalReviews: u.total_reviews ?? 0,
  memberSince: (u.member_since || u.date_joined || '').split('T')[0] || '',
  skills: Array.isArray(u.skills) ? u.skills : [],
  badge: u.badge || undefined,
  completedTrades: u.completed_trades ?? 0,
  isAdmin: u.is_admin || u.is_staff || false,
  hoursGiven: u.hours_given ?? 0,
  hoursReceived: u.hours_received ?? 0,
  searchRadiusKm: u.search_radius_km ?? undefined,
  searchMyCityOnly: u.search_my_city_only ?? undefined,
  maxTradeDistanceKm: u.max_trade_distance_km ?? undefined,
  tradeMyCityOnly: u.trade_my_city_only ?? undefined,
  // Exact address fields (optional)
  streetAddress: u.street_address || '',
  postalCode: u.postal_code || '',
  shareExactLocation: u.share_exact_location ?? false,
});

const mapService = (s: any): Service => ({
  id: String(s.id),
  userId: String(s.user?.id ?? s.user ?? ''),
  type: s.type,
  title: s.title,
  description: s.description || '',
  category: API_CAT_TO_SLUG[s.category?.name] || 'otros',
  duration: s.duration,
  credits: s.credits ?? 1,
  status: s.status,
  createdAt: (s.created_at || '').split('T')[0] || '',
  tags: (s.tags || []).map((t: any) => (typeof t === 'string' ? t : t.name)),
  distanceKm: s.distance_km ?? undefined,
  proximity: s.proximity ?? undefined,
  user: s.user ? mapUser(s.user) : undefined,
  
});

const mapTrade = (t: any): Trade => ({
  id: String(t.id),
  serviceId: String(t.service?.id ?? t.service ?? ''),
  offererId: String(t.offerer?.id ?? t.offerer ?? ''),
  requesterId: String(t.requester?.id ?? t.requester ?? ''),
  status: t.status,
  scheduledDate: t.scheduled_date || '',
  creditsAmount: t.credits_amount ?? 0,
  createdAt: (t.created_at || '').split('T')[0] || '',
  completedAt: t.completed_at ? (t.completed_at || '').split('T')[0] : undefined,
  notes: t.notes || '',
  lastProposedById: t.last_proposed_by ? String(t.last_proposed_by?.id ?? t.last_proposed_by) : undefined,
  lastProposedAt: t.last_proposed_at || undefined,
  conversationId: t.conversation_id ? String(t.conversation_id) : undefined,
});

const mapMessage = (m: any, convId: string): Message => ({
  id: String(m.id),
  conversationId: convId,
  senderId: String(m.sender?.id ?? m.sender ?? ''),
  content: m.content,
  messageType: m.message_type || 'text',
  trade: m.trade ? mapTrade(m.trade) : undefined,
  payload: m.payload || undefined,
  timestamp: m.timestamp,
  read: m.read ?? false,
});

const mapConversation = (c: any): Conversation => ({
  id: String(c.id),
  participants: (c.participants || []).map((p: any) => String(p.id ?? p)),
  lastMessage: c.last_message || '',
  lastTimestamp: c.last_timestamp || c.updated_at || '',
  unreadCount: c.unread_count ?? 0,
});

const mapReview = (r: any): Review => ({
  id: String(r.id),
  tradeId: String(r.trade?.id ?? r.trade ?? ''),
  reviewerId: String(r.reviewer?.id ?? r.reviewer ?? ''),
  revieweeId: String(r.reviewee?.id ?? r.reviewee ?? ''),
  rating: r.rating,
  comment: r.comment || '',
  createdAt: (r.created_at || '').split('T')[0] || '',
});

// ── TIPO DE CONTEXTO ─────────────────────────────────────────

interface AppContextType {
  // Auth
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string, username?: string) => Promise<boolean>;
  updateProfile: (updates: Partial<User>) => void;

  // Data
  users: User[];
  services: Service[];
  trades: Trade[];
  messages: Message[];
  conversations: Conversation[];
  reviews: Review[];
  loading: boolean;
  apiCategoryMap: Record<string, number>; // slug → api numeric id

  // Service Actions
  addService: (service: Omit<Service, 'id' | 'createdAt'>) => void;
  updateService: (id: string, updates: Partial<Service>) => void;
  deleteService: (id: string) => void;

  // Trade Actions
  createTrade: (trade: Omit<Trade, 'id' | 'createdAt'>) => Promise<any>;
  updateTrade: (id: string, updates: Partial<Trade>) => Promise<void>;
  negotiateTrade: (id: string, updates: Partial<Trade> & { message?: string }) => Promise<Trade | undefined>;

  // Message Actions
  sendMessage: (conversationId: string, content: string) => void;
  startConversation: (otherUserId: string) => Promise<string>;
  markConversationRead: (conversationId: string) => void;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  refreshConversationMessages: (conversationId: string) => Promise<void>;
  refreshUnread: () => Promise<void>;

  // Review Actions
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => void;

  // Admin Actions
  adminDeleteUser: (userId: string) => void;
  adminDeleteService: (serviceId: string) => void;
  adminUpdateUser: (userId: string, updates: Partial<User>) => void;

  // Helpers
  getUserById: (id: string) => User | undefined;
  getServiceById: (id: string) => Service | undefined;
  getTradeById: (id: string) => Trade | undefined;
  getUserReviews: (userId: string) => Review[];
  getUserTrades: (userId: string) => Trade[];
  getConversationMessages: (conversationId: string) => Message[];
  getUserConversations: (userId: string) => Conversation[];
  totalUnreadMessages: number;

  // Location / Maps
  viewerLocation?: { lat: number; lon: number } | null;
  showLocationBanner: boolean;
  requestLocation: () => Promise<void>;
  // Search with filters (distance / my-city)
  searchServices: (filters?: { maxDistanceKm?: number; myCityOnly?: boolean }) => Promise<void>;

  // WebSocket client (presence)
  getWsClient: () => any;

  // Refresh
  refreshServices: () => Promise<void>;
  refreshTrades: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewerLocation, setViewerLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiCategoryMap, setApiCategoryMap] = useState<Record<string, number>>({});
  const loadedConvs = useRef<Set<string>>(new Set());
  const wsRef = useRef<any>(null);
  // Prevent concurrent/duplicate network calls
  const servicesPromiseRef = useRef<Promise<any> | null>(null);
  const conversationsPromiseRef = useRef<Promise<any> | null>(null);
  const heartbeatInFlightRef = useRef(false);
  const initRanRef = useRef(false);
  const conversationsLastFetchedAtRef = useRef<number | null>(null);
  const servicesLastFetchedAtRef = useRef<number | null>(null);

  // ── FETCH APP DATA ────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiGetCategories();
      const cats = data?.results || data || [];
      const map: Record<string, number> = {};
      cats.forEach((c: any) => {
        const slug = API_CAT_TO_SLUG[c.name] || 'otros';
        map[slug] = c.id;
      });
      setApiCategoryMap(map);
    } catch (e) {
      console.error('Error fetching categories', e);
    }
  }, [viewerLocation]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiGetUsers();
      const list = data?.results || data || [];
      setUsers(list.map(mapUser));
    } catch (e) {
      console.error('Error fetching users', e);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    // Rate-limit + dedupe concurrent duplicate fetches
    const MIN_SERVICES_INTERVAL = 3000; // 3s
    if (servicesLastFetchedAtRef.current && Date.now() - servicesLastFetchedAtRef.current < MIN_SERVICES_INTERVAL) {
      return Promise.resolve();
    }
    if (servicesPromiseRef.current) return servicesPromiseRef.current;
    servicesLastFetchedAtRef.current = Date.now();
    servicesPromiseRef.current = (async () => {
      try {
        const params: string[] = [];
        // Prefer explicit viewerLocation (user granted this session),
        // fall back to the authenticated user's saved coordinates if available.
        let lat: number | undefined = undefined;
        let lon: number | undefined = undefined;
        if (viewerLocation) {
          lat = viewerLocation.lat;
          lon = viewerLocation.lon;
        } else if (currentUser && typeof currentUser.latitude === 'number' && typeof currentUser.longitude === 'number') {
          lat = currentUser.latitude;
          lon = currentUser.longitude;
        }
        if (lat !== undefined && lon !== undefined) {
          params.push(`viewer_lat=${lat}&viewer_lon=${lon}`);
        }

        const data = await apiGetServices(params.join('&'));
        const list = data?.results || data || [];
        setServices(list.map(mapService));
      } catch (e) {
        console.error('Error fetching services', e);
      } finally {
        servicesPromiseRef.current = null;
        servicesLastFetchedAtRef.current = Date.now();
      }
    })();
    return servicesPromiseRef.current;
  }, [viewerLocation, currentUser]);

  // If the viewer enables location after initial load, re-fetch services
  // so distance/proximity fields are computed server-side and shown in UI.
  useEffect(() => {
    if (!viewerLocation) return;
    // fire-and-forget; errors are logged in fetchServices
    fetchServices();
  }, [viewerLocation, fetchServices]);

  const searchServices = useCallback(async (filters?: { maxDistanceKm?: number; myCityOnly?: boolean }) => {
    try {
      const params: string[] = [];
      if (viewerLocation) params.push(`viewer_lat=${viewerLocation.lat}&viewer_lon=${viewerLocation.lon}`);
      if (filters?.maxDistanceKm !== undefined && filters?.maxDistanceKm !== null) params.push(`max_distance_km=${filters.maxDistanceKm}`);
      if (filters?.myCityOnly) {
        params.push('my_city_only=true');
        if (currentUser?.city) params.push(`viewer_city=${encodeURIComponent(currentUser.city)}`);
      }
      const data = await apiGetServices(params.join('&'));
      const list = data?.results || data || [];
      setServices(list.map(mapService));
    } catch (e) {
      console.error('Error searching services', e);
    }
  }, [viewerLocation, currentUser]);

  const fetchTrades = useCallback(async () => {
    try {
      const data = await apiGetTrades();
      const list = data?.results || data || [];
      setTrades(list.map(mapTrade));
    } catch (e) {
      console.error('Error fetching trades', e);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    // Rate-limit + dedupe concurrent conversation fetches
    const MIN_CONVERSATIONS_INTERVAL = 5000; // 5s
    if (conversationsLastFetchedAtRef.current && Date.now() - conversationsLastFetchedAtRef.current < MIN_CONVERSATIONS_INTERVAL) {
      return Promise.resolve(conversations);
    }
    if (conversationsPromiseRef.current) return conversationsPromiseRef.current;
    conversationsLastFetchedAtRef.current = Date.now();
    conversationsPromiseRef.current = (async () => {
      try {
        const data = await apiGetConversations();
        const list = data?.results || data || [];
        setConversations(list.map(mapConversation));
      } catch (e) {
        console.error('Error fetching conversations', e);
      } finally {
        conversationsPromiseRef.current = null;
        conversationsLastFetchedAtRef.current = Date.now();
      }
    })();
    return conversationsPromiseRef.current;
  }, []);

  const fetchReviews = useCallback(async (userId: string) => {
    try {
      const data = await apiGetReviews(`reviewee=${userId}`);
      const received = (data?.results || data || []).map(mapReview);
      const data2 = await apiGetReviews(`reviewer=${userId}`);
      const given = (data2?.results || data2 || []).map(mapReview);
      const all = [...received, ...given];
      // dedupe
      const seen = new Set<string>();
      setReviews(all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }));
    } catch (e) {
      console.error('Error fetching reviews', e);
    }
  }, []);

  const loadInitialData = useCallback(async (user: User) => {
    const tasks: Promise<any>[] = [
      fetchCategories(),
      fetchUsers(),
      fetchTrades(),
      fetchConversations(),
      fetchReviews(user.id),
    ];

    // Ensure services are fetched using the most accurate viewer coordinates:
    // 1) session viewerLocation (granted this session)
    // 2) saved user coordinates (from profile)
    if (viewerLocation) {
      tasks.push(fetchServices());
    } else if (user && typeof user.latitude === 'number' && typeof user.longitude === 'number') {
      const params = `viewer_lat=${user.latitude}&viewer_lon=${user.longitude}`;
      tasks.push((async () => {
        try {
          const data = await apiGetServices(params);
          const list = data?.results || data || [];
          setServices(list.map(mapService));
        } catch (e) {
          console.error('Error fetching services', e);
        }
      })());
    } else {
      tasks.push(fetchServices());
    }

    await Promise.all(tasks);
  }, [fetchCategories, fetchUsers, fetchServices, fetchTrades, fetchConversations, fetchReviews, viewerLocation]);

  // ── GEOLOCATION: ask once per session and store viewer coords
  // Restore any previously granted viewer coords (anonymous or auth) from sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem('timecircle_viewer_coords');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          setViewerLocation(parsed);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    try {
      const prompted = sessionStorage.getItem('timecircle_geo_prompted');
      if (prompted) return;

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setViewerLocation(coords);
          sessionStorage.setItem('timecircle_geo_prompted', 'yes');
          sessionStorage.setItem('timecircle_viewer_coords', JSON.stringify(coords));
          // If authenticated, persist to profile so backend can resolve city/country
          try {
            if (currentUser) {
              await apiUpdateMe({ latitude: coords.lat, longitude: coords.lon });
              const meData = await apiGetMe();
              if (meData) setCurrentUser(mapUser(meData));
            }
          } catch (e) {
            // ignore update errors
          }
        },
        () => {
          // user denied or error — show a friendly banner offering to enable later
          setShowLocationBanner(true);
          sessionStorage.setItem('timecircle_geo_prompted', 'yes');
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    } catch (e) {
      // no-op
    }
  }, [currentUser]);

  // ── INIT: check stored tokens ─────────────────────────────

  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    const init = async () => {
      const { access } = getTokens();
      if (!access) {
        setLoading(false);
        return;
      }
      try {
        const meData = await apiGetMe();
        if (meData) {
          const user = mapUser(meData);
          setCurrentUser(user);
          await loadInitialData(user);
          // open websocket for presence & messages
          try {
            const hs = await apiGetWSPresenceHandshake();
            if (hs?.ws_key) {
              const url = getWsUrl(`/ws/presence/?ws_key=${encodeURIComponent(hs.ws_key)}`);
              wsRef.current = createWS(url);
              wsRef.current.onMessage((msg: any) => {
                if (msg?.type === 'presence') {
                  setUsers(prev => prev.map(u => (u.id === String(msg.user_id) ? { ...u, presenceStatus: msg.status, isTyping: msg.typing } : u)));
                }
              });
            }
          } catch (e) {
            // ignore ws errors
          }
        }
      } catch (err) {
        console.error('Error fetching current user during init', err);
        // Only clear tokens for authentication-related errors. Transient
        // network or backend errors should not silently log the user out.
        const isAuthError = err && (
          (err as any).status === 401 ||
          (typeof (err as any).detail === 'string' && /token|invalid|authentication|credencial/i.test((err as any).detail))
        );
        if (isAuthError) {
          clearTokens();
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadInitialData]);

  // ── GLOBAL PRESENCE TRACKING ──────────────────────────────
  // Rastrea el estado en línea del usuario actual de forma global,
  // independientemente de qué página está viendo. Inicia en 'en línea'
  // al iniciar sesión, pasa a 'ausente' después de 10 min sin actividad,
  // y se limpia correctamente al desconectarse.
  useEffect(() => {
    const TEN_MINS_IN_MS = 10 * 60 * 1000;
    const HEARTBEAT_INTERVAL_MS = 30 * 1000;

    if (!currentUser) return;

    let currentStatus: 'online' | 'away' = 'online';
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const sendHeartbeat = async () => {
      // Prevent overlapping heartbeat requests
      if (heartbeatInFlightRef.current) return;
      heartbeatInFlightRef.current = true;
      try {
        await apiFetch('/api/presence/heartbeat/', {
          method: 'POST',
          body: JSON.stringify({ status: currentStatus }),
        });
      } catch (e) {
        // ignore errors
      } finally {
        heartbeatInFlightRef.current = false;
      }
    };

    const goAway = () => {
      currentStatus = 'away';
      sendHeartbeat();
    };

    const resetIdle = () => {
      if (currentStatus === 'away') {
        currentStatus = 'online';
        sendHeartbeat();
      }
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(goAway, TEN_MINS_IN_MS);
    };

    // Al iniciar sesión: enviar 'en línea'
    currentStatus = 'online';
    sendHeartbeat();
    resetIdle();

    // Latido cada 30 segundos
    const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Los eventos de actividad resetean el temporizador de inactividad
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));

    // Al descargar/salir: marcar como 'ausente'
    const handleBeforeUnload = () => {
      apiFetch('/api/presence/heartbeat/', {
        method: 'POST',
        body: JSON.stringify({ status: 'away' }),
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Limpieza al desmontar
      clearInterval(heartbeatInterval);
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // ── AUTH ─────────────────────────────────────────────────

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const data = await apiLogin(username, password);
      if (!data?.access) return false;
      const user = mapUser(data.user);
      setCurrentUser(user);
      setLoading(true);
      await loadInitialData(user);
      try {
        const hs = await apiGetWSPresenceHandshake();
        if (hs?.ws_key) {
          const url = getWsUrl(`/ws/presence/?ws_key=${encodeURIComponent(hs.ws_key)}`);
          wsRef.current = createWS(url);
          wsRef.current.onMessage((msg: any) => {
            if (msg?.type === 'presence') {
              setUsers(prev => prev.map(u => (u.id === String(msg.user_id) ? { ...u, presenceStatus: msg.status, isTyping: msg.typing } : u)));
            }
          });
        }
      } catch (e) {
        // ignore
      }
      setLoading(false);
      return true;
    } catch (e) {
      console.error('Login error', e);
      return false;
    }
  }, [loadInitialData]);

  const logout = useCallback(() => {
    apiLogout();
    try { wsRef.current?.close(); } catch (e) { console.error('WebSocket close error during logout', e); }
    setCurrentUser(null);
    setUsers([]);
    setServices([]);
    setTrades([]);
    setMessages([]);
    setConversations([]);
    setReviews([]);
    loadedConvs.current.clear();
  }, []);

  const register = useCallback(async (
    name: string, email: string, password: string, username?: string
  ): Promise<boolean> => {
    try {
      const parts = name.trim().split(' ');
      const first_name = parts[0] || '';
      const last_name = parts.slice(1).join(' ') || '';
      const uname = username || name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const data = await apiRegister({
        username: uname,
        email,
        first_name,
        last_name,
        password,
        password2: password,
      });
      if (!data?.tokens?.access) return false;
      const user = mapUser(data.user);
      setCurrentUser(user);
      setLoading(true);
      await loadInitialData(user);
      setLoading(false);
      return true;
    } catch (e) {
      console.error('Register error', e);
      return false;
    }
  }, [loadInitialData]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!currentUser) return;
    try {
      const payload: any = {};
      if (updates.name !== undefined) {
        const parts = (updates.name || '').trim().split(' ');
        payload.first_name = parts[0] || '';
        payload.last_name = parts.slice(1).join(' ') || '';
      }
      if (updates.bio !== undefined) payload.bio = updates.bio;
      if (updates.location !== undefined) payload.location = updates.location;
      if (updates.avatar !== undefined) payload.avatar = updates.avatar;
      // Location / preference fields (map frontend keys → API snake_case)
      if ((updates as any).city !== undefined) payload.city = (updates as any).city;
      if ((updates as any).country !== undefined) payload.country = (updates as any).country;
      if ((updates as any).latitude !== undefined) payload.latitude = (updates as any).latitude;
      if ((updates as any).longitude !== undefined) payload.longitude = (updates as any).longitude;
      if ((updates as any).streetAddress !== undefined) payload.street_address = (updates as any).streetAddress;
      if ((updates as any).postalCode !== undefined) payload.postal_code = (updates as any).postalCode;
      if ((updates as any).shareExactLocation !== undefined) payload.share_exact_location = (updates as any).shareExactLocation;
      if ((updates as any).searchRadiusKm !== undefined) payload.search_radius_km = (updates as any).searchRadiusKm;
      if ((updates as any).searchMyCityOnly !== undefined) payload.search_my_city_only = (updates as any).searchMyCityOnly;
      if ((updates as any).maxTradeDistanceKm !== undefined) payload.max_trade_distance_km = (updates as any).maxTradeDistanceKm;
      if ((updates as any).tradeMyCityOnly !== undefined) payload.trade_my_city_only = (updates as any).tradeMyCityOnly;
      // Update and refresh full profile from server to ensure latest fields
      await apiUpdateMe(payload);
      const meData = await apiGetMe();
      if (meData) {
        const updated = mapUser(meData);
        setCurrentUser(updated);
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      }
    } catch (e) {
      console.error('Update profile error', e);
    }
  }, [currentUser]);

  // ── SERVICE ACTIONS ───────────────────────────────────────

  const addService = useCallback(async (service: Omit<Service, 'id' | 'createdAt'>) => {
    try {
      const catId = apiCategoryMap[service.category];
      const payload = {
        type: service.type,
        title: service.title,
        description: service.description,
        category_id: catId,
        duration: service.duration,
        credits: service.credits,
        status: service.status || 'active',
        tag_ids: [],
      };
      const res = await apiCreateService(payload);
      setServices(prev => [mapService(res), ...prev]);
    } catch (e) {
      console.error('Create service error', e);
    }
  }, [apiCategoryMap]);

  const updateService = useCallback(async (id: string, updates: Partial<Service>) => {
    try {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.credits !== undefined) payload.credits = updates.credits;
      if (updates.duration !== undefined) payload.duration = updates.duration;
      if (updates.category !== undefined) {
        payload.category_id = apiCategoryMap[updates.category];
      }
      const res = await apiUpdateService(id, payload);
      setServices(prev => prev.map(s => s.id === id ? mapService(res) : s));
    } catch (e) {
      console.error('Update service error', e);
    }
  }, [apiCategoryMap]);

  const deleteService = useCallback(async (id: string) => {
    try {
      await apiDeleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error('Delete service error', e);
    }
  }, []);

  // ── TRADE ACTIONS ────────────────────────────────────────

  const createTrade = useCallback(async (trade: Omit<Trade, 'id' | 'createdAt'>) => {
    try {
      const serviceIdNum = parseInt(trade.serviceId, 10);
      if (Number.isNaN(serviceIdNum)) {
        console.error('Create trade error: invalid serviceId', trade.serviceId);
        return undefined;
      }

      const payload = {
        service_id: serviceIdNum,
        scheduled_date: new Date(trade.scheduledDate).toISOString(),
        credits_amount: trade.creditsAmount,
        notes: trade.notes || '',
      };
      const res = await apiCreateTrade(payload);
      const created = res?.trade ?? res;
      const mappedTrade = mapTrade(created);
      if (res?.warning) {
        try { window.alert(res.warning); } catch (e) { console.warn('Trade warning:', res.warning); }
      }
      setTrades(prev => [mappedTrade, ...prev.filter(t => t.id !== mappedTrade.id)]);
      if (res?.conversation) {
        const conv = mapConversation(res.conversation);
        setConversations(prev => [conv, ...prev.filter(c => c.id !== conv.id)]);
      }
      if (res?.message && res?.conversation) {
        const msg = mapMessage(res.message, String(res.conversation.id));
        setMessages(prev => [...prev.filter(m => m.id !== msg.id), msg]);
      }
      return {
        trade: mappedTrade,
        conversationId: res?.conversation?.id ? String(res.conversation.id) : mappedTrade.conversationId,
        message: res?.message,
      };
    } catch (e) {
      console.error('Create trade error', e);
      return undefined;
    }
  }, []);

  const updateTrade = useCallback(async (id: string, updates: Partial<Trade>) => {
    if (updates.status) {
      try {
        const res = await apiUpdateTradeStatus(id, updates.status);
        setTrades(prev => prev.map(t => t.id === id ? mapTrade(res) : t));
        // Refresh current user credits after trade completion
        if (updates.status === 'completed') {
          const meData = await apiGetMe();
          if (meData && currentUser) {
            const updated = mapUser(meData);
            setCurrentUser(updated);
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
          }
        }
      } catch (e) {
        console.error('Update trade error', e);
      }
    }
  }, [currentUser]);

  const negotiateTrade = useCallback(async (
    id: string,
    updates: Partial<Trade> & { message?: string },
  ): Promise<Trade | undefined> => {
    try {
      const payload: any = {};
      if (updates.scheduledDate !== undefined) {
        payload.scheduled_date = new Date(updates.scheduledDate).toISOString();
      }
      if (updates.creditsAmount !== undefined) payload.credits_amount = updates.creditsAmount;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.message !== undefined) payload.message = updates.message;
      const res = await apiNegotiateTrade(id, payload);
      const mapped = mapTrade(res);
      setTrades(prev => prev.map(t => t.id === id ? mapped : t));
      return mapped;
    } catch (e) {
      console.error('Negotiate trade error', e);
      return undefined;
    }
  }, []);

  // ── CONVERSATION / MESSAGE ACTIONS ────────────────────────

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    if (loadedConvs.current.has(conversationId)) return;
    try {
      const conv = await apiGetConversation(conversationId);
      const msgs = (conv?.messages || []).map((m: any) => mapMessage(m, conversationId));
      setMessages(prev => {
        const existing = prev.filter(m => m.conversationId !== conversationId);
        return [...existing, ...msgs];
      });
      loadedConvs.current.add(conversationId);
    } catch (e) {
      console.error('Load conv messages error', e);
    }
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!currentUser) return;
    try {
      const msg = await apiSendMessage(conversationId, content);
      const mapped = mapMessage(msg, conversationId);
      setMessages(prev => [...prev, mapped]);
      setConversations(prev => prev.map(c =>
        c.id === conversationId
          ? { ...c, lastMessage: content, lastTimestamp: new Date().toISOString() }
          : c
      ));
    } catch (e) {
      console.error('Send message error', e);
    }
  }, [currentUser]);

  const startConversation = useCallback(async (otherUserId: string): Promise<string> => {
    if (!currentUser) return '';
    const existing = conversations.find(c =>
      c.participants.includes(currentUser.id) && c.participants.includes(otherUserId)
    );
    if (existing) return existing.id;
    try {
      const currentUserId = parseInt(currentUser.id, 10);
      const otherId = parseInt(otherUserId, 10);
      if (Number.isNaN(currentUserId) || Number.isNaN(otherId)) {
        console.error('Start conversation error: invalid user id(s)', {
          currentUserId: currentUser.id,
          otherUserId,
        });
        return '';
      }
      const res = await apiCreateConversation([
        currentUserId,
        otherId,
      ]);
      const conv = mapConversation(res);
      setConversations(prev => {
        if (prev.find(c => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
      return conv.id;
    } catch (e) {
      console.error('Start conversation error', e);
      return '';
    }
  }, [currentUser, conversations]);

  const markConversationRead = useCallback(async (conversationId: string) => {
    try {
      await apiMarkConversationRead(conversationId);
      setConversations(prev => prev.map(c =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ));
      setMessages(prev => prev.map(m =>
        m.conversationId === conversationId ? { ...m, read: true } : m
      ));
    } catch (e) {
      // silently fail
    }
  }, []);

  const refreshConversationMessages = useCallback(async (conversationId: string) => {
  try {
    const conv = await apiGetConversation(conversationId);
    const msgs = (conv?.messages || []).map((m: any) => mapMessage(m, conversationId));
    setMessages(prev => {
      const existing = prev.filter(m => m.conversationId !== conversationId);
      // Merge: keep existing IDs to avoid flicker, add new ones
      const existingIds = new Set(existing.map(m => m.id));
      const newMsgs = msgs.filter((m: any) => !existingIds.has(m.id));
      // Also update read status on existing
      const updated = existing.map(m => {
        const fresh = msgs.find((fm: any) => fm.id === m.id);
        return fresh ? { ...m, read: fresh.read } : m;
      });
      return [...updated, ...newMsgs];
    });
    // Update conversation last message / unread
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c;
      const last = conv?.messages?.[conv.messages.length - 1];
      return {
        ...c,
        lastMessage: last?.content ?? c.lastMessage,
        lastTimestamp: last?.timestamp ?? c.lastTimestamp,
        // Unread = msgs from others not yet read
        unreadCount: 0, // will be handled by markRead on open
      };
    }));
  } catch (e) {
    // silently ignore network errors during polling
  }
}, []);
 
const refreshUnread = useCallback(async () => {
  if (!currentUser) return;
  // Use the shared fetchConversations (it has its own dedupe/rate-limit)
  try {
    await fetchConversations();
  } catch (e) {
    // silently ignore
  }
}, [currentUser]);

  // ── REVIEW ACTIONS ────────────────────────────────────────

  const addReview = useCallback(async (review: Omit<Review, 'id' | 'createdAt'>) => {
    try {
      const payload = {
        trade_id: parseInt(review.tradeId),
        reviewee_id: parseInt(review.revieweeId),
        rating: review.rating,
        comment: review.comment,
      };
      const res = await apiCreateReview(payload);
      setReviews(prev => [mapReview(res), ...prev]);
      // Update reviewee rating
      const revieweeData = await apiGetUser(review.revieweeId);
      if (revieweeData) {
        const updatedUser = mapUser(revieweeData);
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      }
    } catch (e) {
      console.error('Add review error', e);
    }
  }, []);

  // ── ADMIN ACTIONS ─────────────────────────────────────────

  const adminDeleteUser = useCallback(async (userId: string) => {
    try {
      await apiAdminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      console.error('Admin delete user error', e);
    }
  }, []);

  const adminDeleteService = useCallback(async (serviceId: string) => {
    try {
      await apiDeleteService(serviceId);
      setServices(prev => prev.filter(s => s.id !== serviceId));
    } catch (e) {
      console.error('Admin delete service error', e);
    }
  }, []);

  const adminUpdateUser = useCallback(async (userId: string, updates: Partial<User>) => {
    try {
      const payload: any = {};
      if (updates.badge !== undefined) payload.badge = updates.badge || null;
      if (updates.credits !== undefined) payload.credits = updates.credits;
      const res = await apiAdminUpdateUser(userId, payload);
      const updated = mapUser({ ...res, id: userId });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
    } catch (e) {
      console.error('Admin update user error', e);
    }
  }, []);

  // ── REFRESH HELPERS ───────────────────────────────────────

  const refreshServices = useCallback(async () => {
    await fetchServices();
  }, [fetchServices]);

  const refreshTrades = useCallback(async () => {
    await fetchTrades();
  }, [fetchTrades]);

  // ── SYNC HELPERS ─────────────────────────────────────────

  const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);
  const getServiceById = useCallback((id: string) => services.find(s => s.id === id), [services]);
  const getTradeById = useCallback((id: string) => trades.find(t => t.id === id), [trades]);
  const getUserReviews = useCallback((userId: string) =>
    reviews.filter(r => r.revieweeId === userId), [reviews]);
  const getUserTrades = useCallback((userId: string) =>
    trades.filter(t => t.offererId === userId || t.requesterId === userId), [trades]);
  const getConversationMessages = useCallback((convId: string) =>
    messages.filter(m => m.conversationId === convId), [messages]);
  const getUserConversations = useCallback((userId: string) =>
    conversations.filter(c => c.participants.includes(userId)), [conversations]);

  const totalUnreadMessages = currentUser
    ? conversations
        .filter(c => c.participants.includes(currentUser.id))
        .reduce((acc, c) => acc + c.unreadCount, 0)
    : 0;

  const requestLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setViewerLocation(coords);
        sessionStorage.setItem('timecircle_viewer_coords', JSON.stringify(coords));
        setShowLocationBanner(false);
        try {
          if (currentUser) {
            await apiUpdateMe({ latitude: coords.lat, longitude: coords.lon });
            const meData = await apiGetMe();
            if (meData) setCurrentUser(mapUser(meData));
          }
        } catch (e) {
          // ignore
        }
        resolve();
      }, () => { setShowLocationBanner(true); resolve(); }, { enableHighAccuracy: false, timeout: 10000 });
    });
  }, [currentUser]);

  return (
    <AppContext.Provider value={{
      currentUser, login, logout, register, updateProfile,
      users, services, trades, messages, conversations, reviews,
      loading, apiCategoryMap,
      addService, updateService, deleteService,
      createTrade, updateTrade, negotiateTrade,
      sendMessage, startConversation, markConversationRead, loadConversationMessages, refreshConversationMessages, refreshUnread,
      addReview,
      adminDeleteUser, adminDeleteService, adminUpdateUser,
      getUserById, getServiceById, getTradeById,
      getUserReviews, getUserTrades, getConversationMessages, getUserConversations,
      totalUnreadMessages,
      refreshServices, refreshTrades,
      searchServices,
      getWsClient: () => wsRef.current,
      // Location helpers
      viewerLocation,
      showLocationBanner,
      requestLocation: requestLocation,
    }}>
      {showLocationBanner && (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex justify-center">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-md flex items-center gap-4 max-w-3xl">
            <div className="text-slate-700">Compartir tu ubicación ayuda a encontrar vecinos cercanos y mejorar los resultados. Puedes activarla desde aquí o más tarde en tu perfil.</div>
            <div className="flex items-center gap-2">
              <button onClick={() => requestLocation()} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg">Activar ubicación</button>
              <button onClick={() => setShowLocationBanner(false)} className="px-2 py-1 text-slate-600">Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
