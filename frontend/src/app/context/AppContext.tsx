import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  User, Service, Trade, Message, Conversation, Review,
  mockUsers, mockServices, mockTrades, mockMessages, mockConversations, mockReviews
} from '../data/mockData';

interface AppContextType {
  // Auth
  currentUser: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  register: (name: string, email: string, password: string) => boolean;
  updateProfile: (updates: Partial<User>) => void;

  // Data
  users: User[];
  services: Service[];
  trades: Trade[];
  messages: Message[];
  conversations: Conversation[];
  reviews: Review[];

  // Service Actions
  addService: (service: Omit<Service, 'id' | 'createdAt'>) => void;
  updateService: (id: string, updates: Partial<Service>) => void;
  deleteService: (id: string) => void;

  // Trade Actions
  createTrade: (trade: Omit<Trade, 'id' | 'createdAt'>) => void;
  updateTrade: (id: string, updates: Partial<Trade>) => void;

  // Message Actions
  sendMessage: (conversationId: string, content: string) => void;
  startConversation: (otherUserId: string) => string;
  markConversationRead: (conversationId: string) => void;

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
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [services, setServices] = useState<Service[]>(mockServices);
  const [trades, setTrades] = useState<Trade[]>(mockTrades);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [reviews, setReviews] = useState<Review[]>(mockReviews);

  const login = useCallback((email: string, password: string): boolean => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const register = useCallback((name: string, email: string, password: string): boolean => {
    if (users.find(u => u.email === email)) return false;
    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      email,
      password,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}&backgroundColor=b6e3f4`,
      bio: '',
      location: 'Valencia',
      credits: 5,
      rating: 0,
      totalReviews: 0,
      memberSince: new Date().toISOString().split('T')[0],
      skills: [],
      completedTrades: 0,
      hoursGiven: 0,
      hoursReceived: 0,
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return true;
  }, [users]);

  const updateProfile = useCallback((updates: Partial<User>) => {
    if (!currentUser) return;
    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updates } : u));
    setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
  }, [currentUser]);

  const addService = useCallback((service: Omit<Service, 'id' | 'createdAt'>) => {
    const newService: Service = {
      ...service,
      id: `s${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setServices(prev => [newService, ...prev]);
  }, []);

  const updateService = useCallback((id: string, updates: Partial<Service>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteService = useCallback((id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  }, []);

  const createTrade = useCallback((trade: Omit<Trade, 'id' | 'createdAt'>) => {
    const newTrade: Trade = {
      ...trade,
      id: `t${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTrades(prev => [newTrade, ...prev]);
  }, []);

  const updateTrade = useCallback((id: string, updates: Partial<Trade>) => {
    setTrades(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, ...updates };
      // When trade is completed, transfer credits
      if (updates.status === 'completed' && t.status !== 'completed') {
        const offerer = users.find(u => u.id === t.offererId);
        const requester = users.find(u => u.id === t.requesterId);
        if (offerer && requester) {
          setUsers(prev => prev.map(u => {
            if (u.id === t.offererId) return { ...u, credits: u.credits + t.creditsAmount, hoursGiven: u.hoursGiven + (t.creditsAmount), completedTrades: u.completedTrades + 1 };
            if (u.id === t.requesterId) return { ...u, credits: Math.max(0, u.credits - t.creditsAmount), hoursReceived: u.hoursReceived + (t.creditsAmount), completedTrades: u.completedTrades + 1 };
            return u;
          }));
          if (currentUser?.id === t.offererId) {
            setCurrentUser(prev => prev ? { ...prev, credits: prev.credits + t.creditsAmount, completedTrades: prev.completedTrades + 1 } : null);
          } else if (currentUser?.id === t.requesterId) {
            setCurrentUser(prev => prev ? { ...prev, credits: Math.max(0, prev.credits - t.creditsAmount), completedTrades: prev.completedTrades + 1 } : null);
          }
        }
      }
      return updated;
    }));
  }, [users, currentUser]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (!currentUser) return;
    const newMessage: Message = {
      id: `m${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, newMessage]);
    setConversations(prev => prev.map(c =>
      c.id === conversationId
        ? { ...c, lastMessage: content, lastTimestamp: new Date().toISOString() }
        : c
    ));
  }, [currentUser]);

  const startConversation = useCallback((otherUserId: string): string => {
    if (!currentUser) return '';
    const existing = conversations.find(c =>
      c.participants.includes(currentUser.id) && c.participants.includes(otherUserId)
    );
    if (existing) return existing.id;
    const newConv: Conversation = {
      id: `c${Date.now()}`,
      participants: [currentUser.id, otherUserId],
      lastMessage: '',
      lastTimestamp: new Date().toISOString(),
      unreadCount: 0,
    };
    setConversations(prev => [newConv, ...prev]);
    return newConv.id;
  }, [currentUser, conversations]);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations(prev => prev.map(c =>
      c.id === conversationId ? { ...c, unreadCount: 0 } : c
    ));
    setMessages(prev => prev.map(m =>
      m.conversationId === conversationId ? { ...m, read: true } : m
    ));
  }, []);

  const addReview = useCallback((review: Omit<Review, 'id' | 'createdAt'>) => {
    const newReview: Review = {
      ...review,
      id: `r${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setReviews(prev => [newReview, ...prev]);
    // Update user rating
    const userReviews = [...reviews, newReview].filter(r => r.revieweeId === review.revieweeId);
    const avgRating = userReviews.reduce((acc, r) => acc + r.rating, 0) / userReviews.length;
    setUsers(prev => prev.map(u =>
      u.id === review.revieweeId
        ? { ...u, rating: Math.round(avgRating * 10) / 10, totalReviews: userReviews.length }
        : u
    ));
  }, [reviews]);

  const adminDeleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  const adminDeleteService = useCallback((serviceId: string) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
  }, []);

  const adminUpdateUser = useCallback((userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
  }, []);

  // Helpers
  const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);
  const getServiceById = useCallback((id: string) => services.find(s => s.id === id), [services]);
  const getTradeById = useCallback((id: string) => trades.find(t => t.id === id), [trades]);
  const getUserReviews = useCallback((userId: string) => reviews.filter(r => r.revieweeId === userId), [reviews]);
  const getUserTrades = useCallback((userId: string) => trades.filter(t => t.offererId === userId || t.requesterId === userId), [trades]);
  const getConversationMessages = useCallback((conversationId: string) => messages.filter(m => m.conversationId === conversationId), [messages]);
  const getUserConversations = useCallback((userId: string) => conversations.filter(c => c.participants.includes(userId)), [conversations]);

  const totalUnreadMessages = currentUser
    ? conversations
        .filter(c => c.participants.includes(currentUser.id))
        .reduce((acc, c) => acc + c.unreadCount, 0)
    : 0;

  return (
    <AppContext.Provider value={{
      currentUser, login, logout, register, updateProfile,
      users, services, trades, messages, conversations, reviews,
      addService, updateService, deleteService,
      createTrade, updateTrade,
      sendMessage, startConversation, markConversationRead,
      addReview,
      adminDeleteUser, adminDeleteService, adminUpdateUser,
      getUserById, getServiceById, getTradeById,
      getUserReviews, getUserTrades, getConversationMessages, getUserConversations,
      totalUnreadMessages,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
