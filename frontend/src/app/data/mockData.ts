export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  bio: string;
  location: string;
  credits: number;
  rating: number;
  totalReviews: number;
  memberSince: string;
  skills: string[];
  badge?: 'gold' | 'silver' | 'bronze';
  completedTrades: number;
  isAdmin?: boolean;
  hoursGiven: number;
  hoursReceived: number;
}

export interface Service {
  id: string;
  userId: string;
  type: 'offer' | 'request';
  title: string;
  description: string;
  category: string;
  duration: number; // in minutes
  credits: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  tags: string[];
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
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
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

export const CATEGORIES = [
  { id: 'hogar', label: 'Hogar', icon: '🏠', color: 'bg-blue-100 text-blue-700' },
  { id: 'jardin', label: 'Jardín', icon: '🌱', color: 'bg-green-100 text-green-700' },
  { id: 'cuidados', label: 'Cuidados', icon: '👶', color: 'bg-pink-100 text-pink-700' },
  { id: 'cocina', label: 'Cocina', icon: '🍳', color: 'bg-orange-100 text-orange-700' },
  { id: 'educacion', label: 'Educación', icon: '📚', color: 'bg-purple-100 text-purple-700' },
  { id: 'transporte', label: 'Transporte', icon: '🚗', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'tecnologia', label: 'Tecnología', icon: '💻', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'arte', label: 'Arte', icon: '🎨', color: 'bg-rose-100 text-rose-700' },
  { id: 'bienestar', label: 'Bienestar', icon: '💪', color: 'bg-teal-100 text-teal-700' },
  { id: 'bricolaje', label: 'Bricolaje', icon: '🔨', color: 'bg-amber-100 text-amber-700' },
  { id: 'recados', label: 'Recados', icon: '🛍️', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'otros', label: 'Otros', icon: '✨', color: 'bg-gray-100 text-gray-700' },
];

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Ana García',
    email: 'ana@timecircle.es',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana&backgroundColor=b6e3f4',
    bio: 'Profesora de inglés jubilada. Me encanta ayudar a los vecinos y aprender cosas nuevas.',
    location: 'Barrio del Carmen, Valencia',
    credits: 12,
    rating: 4.9,
    totalReviews: 23,
    memberSince: '2024-01-15',
    skills: ['Inglés', 'Cocina', 'Cuidado de mayores'],
    badge: 'gold',
    completedTrades: 31,
    hoursGiven: 48,
    hoursReceived: 32,
    isAdmin: false,
  },
  {
    id: 'u2',
    name: 'Carlos Martínez',
    email: 'carlos@timecircle.es',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos&backgroundColor=ffdfbf',
    bio: 'Electricista con 15 años de experiencia. Apasionado del bricolaje y la mecánica.',
    location: 'Barrio del Carmen, Valencia',
    credits: 8,
    rating: 4.7,
    totalReviews: 18,
    memberSince: '2024-02-20',
    skills: ['Electricidad', 'Fontanería', 'Bricolaje'],
    badge: 'silver',
    completedTrades: 22,
    hoursGiven: 35,
    hoursReceived: 28,
  },
  {
    id: 'u3',
    name: 'María López',
    email: 'maria@timecircle.es',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria&backgroundColor=c0aede',
    bio: 'Diseñadora gráfica freelance y amante de la jardinería urbana.',
    location: 'Barrio del Carmen, Valencia',
    credits: 15,
    rating: 4.8,
    totalReviews: 15,
    memberSince: '2024-03-10',
    skills: ['Diseño gráfico', 'Jardinería', 'Fotografía'],
    badge: 'gold',
    completedTrades: 18,
    hoursGiven: 28,
    hoursReceived: 15,
  },
  {
    id: 'u4',
    name: 'Pedro Sánchez',
    email: 'pedro@timecircle.es',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro&backgroundColor=d1d4f9',
    bio: 'Chef aficionado y padre de familia. Me gusta cocinar para los vecinos.',
    location: 'Barrio del Carmen, Valencia',
    credits: 5,
    rating: 4.5,
    totalReviews: 10,
    memberSince: '2024-04-01',
    skills: ['Cocina mediterránea', 'Repostería', 'Cuidado de niños'],
    badge: 'bronze',
    completedTrades: 12,
    hoursGiven: 18,
    hoursReceived: 22,
  },
  {
    id: 'u5',
    name: 'Laura Fernández',
    email: 'laura@timecircle.es',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Laura&backgroundColor=ffd5dc',
    bio: 'Fisioterapeuta y profesora de yoga. Creo en el bienestar comunitario.',
    location: 'Barrio del Carmen, Valencia',
    credits: 20,
    rating: 5.0,
    totalReviews: 28,
    memberSince: '2023-11-05',
    skills: ['Yoga', 'Fisioterapia', 'Meditación'],
    badge: 'gold',
    completedTrades: 35,
    hoursGiven: 60,
    hoursReceived: 40,
  },
  {
    id: 'u6',
    name: 'Admin TimeCircle',
    email: 'admin@timecircle.es',
    password: 'admin123',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin&backgroundColor=b6e3f4',
    bio: 'Administrador de la plataforma TimeCircle.',
    location: 'Valencia',
    credits: 100,
    rating: 5.0,
    totalReviews: 0,
    memberSince: '2023-10-01',
    skills: ['Administración'],
    completedTrades: 0,
    hoursGiven: 0,
    hoursReceived: 0,
    isAdmin: true,
  },
  {
    id: 'u7',
    name: 'Sofía Ruiz',
    email: 'sofia@timecircle.es',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=c0aede',
    bio: 'Estudiante de informática. Me encanta ayudar a personas mayores con la tecnología.',
    location: 'Barrio del Carmen, Valencia',
    credits: 7,
    rating: 4.6,
    totalReviews: 8,
    memberSince: '2024-05-15',
    skills: ['Informática', 'Redes sociales', 'Idiomas'],
    badge: 'bronze',
    completedTrades: 9,
    hoursGiven: 14,
    hoursReceived: 12,
  },
  {
    id: 'u8',
    name: 'Miguel Torres',
    email: 'miguel@timecircle.es',
    password: '123456',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Miguel&backgroundColor=ffdfbf',
    bio: 'Carpintero artesano. Restauro muebles y hago pequeñas reparaciones.',
    location: 'Barrio del Carmen, Valencia',
    credits: 11,
    rating: 4.7,
    totalReviews: 14,
    memberSince: '2024-01-30',
    skills: ['Carpintería', 'Restauración', 'Pintura'],
    badge: 'silver',
    completedTrades: 16,
    hoursGiven: 24,
    hoursReceived: 18,
  },
];

export const mockServices: Service[] = [
  {
    id: 's1',
    userId: 'u1',
    type: 'offer',
    title: 'Clases de inglés para principiantes',
    description: 'Ofrezco clases de inglés conversacional para adultos y niños. 30 años de experiencia como profesora. Adapto el método al nivel del alumno.',
    category: 'educacion',
    duration: 60,
    credits: 1,
    status: 'active',
    createdAt: '2024-06-01',
    tags: ['inglés', 'idiomas', 'clases'],
  },
  {
    id: 's2',
    userId: 'u1',
    type: 'offer',
    title: 'Acompañamiento a personas mayores',
    description: 'Acompaño a personas mayores al médico, farmacia o simplemente paseo con ellas. Tengo mucha paciencia y cariño.',
    category: 'cuidados',
    duration: 120,
    credits: 2,
    status: 'active',
    createdAt: '2024-06-05',
    tags: ['mayores', 'acompañamiento', 'cuidados'],
  },
  {
    id: 's3',
    userId: 'u2',
    type: 'offer',
    title: 'Reparación de enchufes y pequeñas instalaciones',
    description: 'Puedo ayudar con reparaciones eléctricas básicas: cambio de enchufes, interruptores, lámparas. Siempre con seguridad.',
    category: 'bricolaje',
    duration: 90,
    credits: 1.5,
    status: 'active',
    createdAt: '2024-06-03',
    tags: ['electricidad', 'reparaciones', 'hogar'],
  },
  {
    id: 's4',
    userId: 'u2',
    type: 'request',
    title: 'Necesito clases de inglés básico',
    description: 'Necesito mejorar mi inglés para el trabajo. Busco a alguien paciente que pueda enseñarme desde cero.',
    category: 'educacion',
    duration: 60,
    credits: 1,
    status: 'active',
    createdAt: '2024-06-10',
    tags: ['inglés', 'aprender', 'básico'],
  },
  {
    id: 's5',
    userId: 'u3',
    type: 'offer',
    title: 'Diseño de logo o cartel para tu negocio',
    description: 'Soy diseñadora gráfica y puedo crear materiales visuales para tu negocio o evento local. Uso Illustrator y Photoshop.',
    category: 'arte',
    duration: 120,
    credits: 2,
    status: 'active',
    createdAt: '2024-06-02',
    tags: ['diseño', 'logo', 'gráfico'],
  },
  {
    id: 's6',
    userId: 'u3',
    type: 'offer',
    title: 'Mantenimiento de jardín y huerto urbano',
    description: 'Me encanta la jardinería. Puedo ayudarte a mantener tu jardín, balcón o huerto urbano con técnicas ecológicas.',
    category: 'jardin',
    duration: 90,
    credits: 1.5,
    status: 'active',
    createdAt: '2024-06-08',
    tags: ['jardín', 'plantas', 'ecológico'],
  },
  {
    id: 's7',
    userId: 'u4',
    type: 'offer',
    title: 'Cocina casera para llevar (para 4 personas)',
    description: 'Preparo comida mediterránea casera. Puedo hacer menús semanales o platos especiales para ocasiones. Sin gluten disponible.',
    category: 'cocina',
    duration: 180,
    credits: 3,
    status: 'active',
    createdAt: '2024-06-07',
    tags: ['cocina', 'mediterránea', 'casera'],
  },
  {
    id: 's8',
    userId: 'u4',
    type: 'request',
    title: 'Busco ayuda con el jardín de mi terraza',
    description: 'Tengo una terraza grande pero no sé mucho de plantas. Necesito que alguien me ayude a organizarla y me enseñe a mantenerla.',
    category: 'jardin',
    duration: 120,
    credits: 2,
    status: 'active',
    createdAt: '2024-06-12',
    tags: ['terraza', 'plantas', 'aprender'],
  },
  {
    id: 's9',
    userId: 'u5',
    type: 'offer',
    title: 'Clase de yoga o meditación en el parque',
    description: 'Imparto clases de yoga y meditación para todos los niveles. Grupos reducidos en el parque del barrio los fines de semana.',
    category: 'bienestar',
    duration: 60,
    credits: 1,
    status: 'active',
    createdAt: '2024-05-20',
    tags: ['yoga', 'meditación', 'bienestar'],
  },
  {
    id: 's10',
    userId: 'u5',
    type: 'offer',
    title: 'Masaje terapéutico y fisioterapia básica',
    description: 'Soy fisioterapeuta titulada. Puedo hacer masajes relajantes o terapéuticos en caso de contracturas o dolores musculares.',
    category: 'bienestar',
    duration: 60,
    credits: 1,
    status: 'active',
    createdAt: '2024-05-25',
    tags: ['fisioterapia', 'masaje', 'salud'],
  },
  {
    id: 's11',
    userId: 'u7',
    type: 'offer',
    title: 'Ayuda con el ordenador o smartphone',
    description: 'Ayudo a personas mayores con su ordenador, tablet o móvil. Instalación de aplicaciones, videollamadas, correo electrónico.',
    category: 'tecnologia',
    duration: 60,
    credits: 1,
    status: 'active',
    createdAt: '2024-06-15',
    tags: ['tecnología', 'ordenador', 'mayores'],
  },
  {
    id: 's12',
    userId: 'u8',
    type: 'offer',
    title: 'Reparación y restauración de muebles',
    description: 'Restauro muebles de madera, reparo sillas, mesas, armarios. Trabajo cuidadoso y con materiales de calidad.',
    category: 'bricolaje',
    duration: 120,
    credits: 2,
    status: 'active',
    createdAt: '2024-06-04',
    tags: ['carpintería', 'muebles', 'restauración'],
  },
  {
    id: 's13',
    userId: 'u7',
    type: 'request',
    title: 'Busco recetas y clases de repostería',
    description: 'Me gustaría aprender a hacer tartas y galletas. Busco a alguien que me enseñe en casa o que podamos hacerlo juntos.',
    category: 'cocina',
    duration: 120,
    credits: 2,
    status: 'active',
    createdAt: '2024-06-18',
    tags: ['repostería', 'recetas', 'aprender'],
  },
  {
    id: 's14',
    userId: 'u8',
    type: 'request',
    title: 'Necesito transporte al aeropuerto',
    description: 'Necesito que alguien me lleve al aeropuerto de Valencia el próximo mes. Puedo devolver el favor con carpintería.',
    category: 'transporte',
    duration: 90,
    credits: 1.5,
    status: 'active',
    createdAt: '2024-06-20',
    tags: ['transporte', 'aeropuerto', 'coche'],
  },
];

export const mockTrades: Trade[] = [
  {
    id: 't1',
    serviceId: 's1',
    offererId: 'u1',
    requesterId: 'u2',
    status: 'completed',
    scheduledDate: '2024-06-15',
    creditsAmount: 1,
    createdAt: '2024-06-10',
    completedAt: '2024-06-15',
    notes: 'Clase de inglés completada con éxito',
  },
  {
    id: 't2',
    serviceId: 's3',
    offererId: 'u2',
    requesterId: 'u4',
    status: 'completed',
    scheduledDate: '2024-06-12',
    creditsAmount: 1.5,
    createdAt: '2024-06-09',
    completedAt: '2024-06-12',
    notes: 'Reparación del enchute del salón',
  },
  {
    id: 't3',
    serviceId: 's9',
    offererId: 'u5',
    requesterId: 'u3',
    status: 'accepted',
    scheduledDate: '2024-07-01',
    creditsAmount: 1,
    createdAt: '2024-06-20',
    notes: 'Clase de yoga el domingo a las 10h',
  },
  {
    id: 't4',
    serviceId: 's5',
    offererId: 'u3',
    requesterId: 'u7',
    status: 'pending',
    scheduledDate: '2024-07-05',
    creditsAmount: 2,
    createdAt: '2024-06-22',
    notes: 'Diseño de logo para mi pequeño negocio',
  },
  {
    id: 't5',
    serviceId: 's10',
    offererId: 'u5',
    requesterId: 'u8',
    status: 'in_progress',
    scheduledDate: '2024-06-28',
    creditsAmount: 1,
    createdAt: '2024-06-25',
    notes: 'Masaje por contractura de espalda',
  },
  {
    id: 't6',
    serviceId: 's7',
    offererId: 'u4',
    requesterId: 'u1',
    status: 'completed',
    scheduledDate: '2024-06-18',
    creditsAmount: 3,
    createdAt: '2024-06-15',
    completedAt: '2024-06-18',
    notes: 'Menú para cena familiar',
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'c1',
    participants: ['u1', 'u2'],
    lastMessage: '¡Perfecto! Nos vemos el martes a las 17h entonces.',
    lastTimestamp: '2024-06-22T16:30:00',
    unreadCount: 0,
  },
  {
    id: 'c2',
    participants: ['u1', 'u5'],
    lastMessage: 'Muchas gracias por la clase de yoga, fue genial!',
    lastTimestamp: '2024-06-21T10:15:00',
    unreadCount: 2,
  },
  {
    id: 'c3',
    participants: ['u3', 'u7'],
    lastMessage: '¿Puedes enviarme más detalles sobre el logo?',
    lastTimestamp: '2024-06-20T14:45:00',
    unreadCount: 1,
  },
];

export const mockMessages: Message[] = [
  {
    id: 'm1',
    conversationId: 'c1',
    senderId: 'u2',
    content: 'Hola Ana, vi tu oferta de clases de inglés. ¿Tienes disponibilidad esta semana?',
    timestamp: '2024-06-22T15:00:00',
    read: true,
  },
  {
    id: 'm2',
    conversationId: 'c1',
    senderId: 'u1',
    content: 'Hola Carlos! Sí, tengo hueco el martes y el jueves por la tarde.',
    timestamp: '2024-06-22T15:30:00',
    read: true,
  },
  {
    id: 'm3',
    conversationId: 'c1',
    senderId: 'u2',
    content: 'El martes me va perfecto. ¿A las 17h?',
    timestamp: '2024-06-22T16:00:00',
    read: true,
  },
  {
    id: 'm4',
    conversationId: 'c1',
    senderId: 'u1',
    content: '¡Perfecto! Nos vemos el martes a las 17h entonces.',
    timestamp: '2024-06-22T16:30:00',
    read: true,
  },
  {
    id: 'm5',
    conversationId: 'c2',
    senderId: 'u1',
    content: 'Hola Laura! Me han hablado maravillas de tus clases de yoga.',
    timestamp: '2024-06-21T09:00:00',
    read: true,
  },
  {
    id: 'm6',
    conversationId: 'c2',
    senderId: 'u5',
    content: '¡Gracias Ana! El próximo domingo hay clase en el parque a las 10h. ¡Anímate!',
    timestamp: '2024-06-21T09:30:00',
    read: true,
  },
  {
    id: 'm7',
    conversationId: 'c2',
    senderId: 'u1',
    content: 'Muchas gracias por la clase de yoga, fue genial!',
    timestamp: '2024-06-21T10:15:00',
    read: false,
  },
  {
    id: 'm8',
    conversationId: 'c2',
    senderId: 'u5',
    content: '¡Me alegra que te gustara! ¿Repetimos la semana que viene?',
    timestamp: '2024-06-21T10:20:00',
    read: false,
  },
];

export const mockReviews: Review[] = [
  {
    id: 'r1',
    tradeId: 't1',
    reviewerId: 'u2',
    revieweeId: 'u1',
    rating: 5,
    comment: 'Ana es una profesora extraordinaria. Muy paciente y con un método excelente. ¡100% recomendada!',
    createdAt: '2024-06-16',
  },
  {
    id: 'r2',
    tradeId: 't1',
    reviewerId: 'u1',
    revieweeId: 'u2',
    rating: 5,
    comment: 'Carlos es muy puntual y tiene ganas de aprender. ¡Un placer enseñarle!',
    createdAt: '2024-06-16',
  },
  {
    id: 'r3',
    tradeId: 't2',
    reviewerId: 'u4',
    revieweeId: 'u2',
    rating: 4,
    comment: 'Muy buen trabajo con la electricidad. Rápido y eficiente. Volvería a pedirle ayuda.',
    createdAt: '2024-06-13',
  },
  {
    id: 'r4',
    tradeId: 't6',
    reviewerId: 'u1',
    revieweeId: 'u4',
    rating: 5,
    comment: 'Pedro cocina de maravilla. La cena familiar fue un éxito total. ¡Gracias!',
    createdAt: '2024-06-19',
  },
  {
    id: 'r5',
    tradeId: 't6',
    reviewerId: 'u4',
    revieweeId: 'u1',
    rating: 5,
    comment: 'Ana es muy amable y agradecida. Un placer cocinar para ella.',
    createdAt: '2024-06-19',
  },
];
