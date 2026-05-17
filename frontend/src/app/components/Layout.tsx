import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router';
import {
  Home, Search, ArrowLeftRight, MessageCircle, Star,
  User, LogOut, Clock, Shield, History, Menu, X, Plus, ChevronDown, Loader2, Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { path: '/dashboard',   label: 'Inicio',        icon: Home },
  { path: '/services',    label: 'Servicios',      icon: Search },
  { path: '/calendar',    label: 'Calendario',     icon: Calendar },
  { path: '/trades',      label: 'Intercambios',   icon: ArrowLeftRight },
  { path: '/messages',    label: 'Mensajes',       icon: MessageCircle },
  { path: '/leaderboard', label: 'Ranking',        icon: Star },
  { path: '/history',     label: 'Historial',      icon: History },
];

export const Layout: React.FC = () => {
  const { currentUser, logout, totalUnreadMessages, loading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Esperar a que el contexto valide el token
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center mx-auto mb-4 shadow-md shadow-teal-500/30">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-teal-500 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: '0.875rem' }}>Cargando TimeCircle...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar barra lateral"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 dark:bg-black/70 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 
        bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-800
        flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        shadow-xl dark:shadow-slate-950/50 lg:shadow-none
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center shadow-md shadow-teal-500/30">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-slate-900 dark:text-white tracking-tight" style={{ fontWeight: 700, fontSize: '1.1rem' }}>TimeCircle</span>
            <div className="text-xs text-slate-400 dark:text-slate-500">Banco de Tiempo</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Credits pill */}
        <div className="mx-4 mt-4 mb-2">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/60 dark:to-amber-900/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 dark:bg-amber-500 flex items-center justify-center shadow-sm shadow-amber-500/40">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs text-amber-700 dark:text-amber-400">Mis créditos</div>
              <div className="text-amber-900 dark:text-amber-300" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{currentUser?.credits ?? 0} h</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                  active
                    ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-sm shadow-teal-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span style={{ fontSize: '0.9rem' }}>{label}</span>
                {path === '/messages' && totalUnreadMessages > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalUnreadMessages}
                  </span>
                )}
              </Link>
            );
          })}

          {currentUser?.isAdmin && (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mt-2 ${
                isActive('/admin')
                  ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span style={{ fontSize: '0.9rem' }}>Administración</span>
            </Link>
          )}
        </nav>

        {/* Quick add */}
        <div className="px-4 pb-3">
          <Link
            to="/services/new"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-xl transition-colors shadow-sm shadow-teal-500/30"
          >
            <Plus className="w-4 h-4" />
            <span style={{ fontSize: '0.9rem' }}>Publicar Servicio</span>
          </Link>
        </div>

        {/* Profile bottom */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          <Link
            to={`/profile/${currentUser?.id}`}
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl p-2 transition-colors"
          >
            <img src={currentUser?.avatar} alt={currentUser?.name} className="w-9 h-9 rounded-full border-2 border-teal-200 dark:border-teal-800" />
            <div className="flex-1 min-w-0">
              <div className="text-slate-900 dark:text-slate-100 truncate" style={{ fontWeight: 600, fontSize: '0.875rem' }}>{currentUser?.name}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">Ver perfil</div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="mt-2 flex items-center gap-2 w-full px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span style={{ fontSize: '0.875rem' }}>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-14 flex items-center px-4 lg:px-6 gap-4 transition-colors duration-300">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <Link
            to="/services/new"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg transition-colors shadow-sm shadow-teal-500/30"
            style={{ fontSize: '0.875rem' }}
          >
            <Plus className="w-4 h-4" />
            Publicar
          </Link>

          <Link
            to="/messages"
            className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {totalUnreadMessages > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: '0.625rem' }}>
                {totalUnreadMessages}
              </span>
            )}
          </Link>

          <ThemeToggle />

          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-2 py-1.5 transition-colors"
            >
              <img src={currentUser?.avatar} alt="" className="w-7 h-7 rounded-full ring-2 ring-teal-500/30" />
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-slate-950/60 border border-slate-200 dark:border-slate-700 py-1 z-50">
                <Link
                  to={`/profile/${currentUser?.id}`}
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  style={{ fontSize: '0.875rem' }}
                >
                  <User className="w-4 h-4" />
                  Mi Perfil
                </Link>
                <hr className="my-1 border-slate-100 dark:border-slate-700" />
                <button
                  onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  style={{ fontSize: '0.875rem' }}
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
