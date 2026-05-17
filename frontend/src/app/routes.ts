import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Services } from './pages/Services';
import { ServiceDetail } from './pages/ServiceDetail';
import { NewService } from './pages/NewService';
import { Trades } from './pages/Trades';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';
import { Leaderboard } from './pages/Leaderboard';
import { Calendar } from './pages/Calendar';
import { Admin } from './pages/Admin';
import { History } from './pages/History';
import { TermsOfService } from './pages/TermsOfService';
import { Contact } from './pages/Contact';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Landing,
  },
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/register',
    Component: Register,
  },
  // ── Páginas públicas (sin Layout autenticado) ──
  {
    path: '/terminos',
    Component: TermsOfService,
  },
  {
    path: '/contacto',
    Component: Contact,
  },
  // ── Área privada ──
  {
    path: '/',
    Component: Layout,
    children: [
      { path: 'dashboard',    Component: Dashboard },
      { path: 'services',     Component: Services },
      { path: 'services/new', Component: NewService },
      { path: 'services/:id', Component: ServiceDetail },
      { path: 'calendar',     Component: Calendar },
      { path: 'trades',       Component: Trades },
      { path: 'messages',     Component: Messages },
      { path: 'profile/:id',  Component: Profile },
      { path: 'leaderboard',  Component: Leaderboard },
      { path: 'history',      Component: History },
      { path: 'admin',        Component: Admin },
    ],
  },
  {
    path: '*',
    Component: NotFound,
  },
]);
