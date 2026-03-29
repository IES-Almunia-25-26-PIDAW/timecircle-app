import { apiFetch, setTokens, clearTokens, getTokens } from './client';

// ── AUTH ──────────────────────────────────────────────────

export const apiLogin = async (username: string, password: string) => {
  const data = await apiFetch('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data?.access) setTokens(data.access, data.refresh);
  return data;
};

export const apiRegister = async (userData: {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password2: string;
  location?: string;
  bio?: string;
}) => {
  const data = await apiFetch('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  if (data?.tokens) setTokens(data.tokens.access, data.tokens.refresh);
  return data;
};

export const apiLogout = async () => {
  const { refresh } = getTokens();
  if (refresh) {
    await apiFetch('/api/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }).catch(() => {});
  }
  clearTokens();
};

export const apiGetMe = () => apiFetch('/api/auth/me/');
export const apiUpdateMe = (data: any) =>
  apiFetch('/api/auth/me/', { method: 'PATCH', body: JSON.stringify(data) });

// ── USERS ─────────────────────────────────────────────────

export const apiGetUsers = () =>
  apiFetch('/api/users/?ordering=-completed_trades&page_size=100');
export const apiGetUser = (id: number | string) => apiFetch(`/api/users/${id}/`);
export const apiGetUserRanking = () => apiFetch('/api/users/ranking/');
export const apiGetUserActivity = () => apiFetch('/api/users/activity/');
export const apiGetUserTransactions = () => apiFetch('/api/users/transactions/');
export const apiGetUserServices = (id: number | string) =>
  apiFetch(`/api/users/${id}/services/`);
export const apiGetUserReviews = (id: number | string) =>
  apiFetch(`/api/users/${id}/reviews/`);

// ── CATEGORIES ────────────────────────────────────────────

export const apiGetCategories = () => apiFetch('/api/categories/?page_size=50');

// ── SERVICES ─────────────────────────────────────────────

export const apiGetServices = (params = '') =>
  apiFetch(`/api/services/${params ? '?' + params : ''}`);
export const apiGetService = (id: number | string) => apiFetch(`/api/services/${id}/`);
export const apiCreateService = (data: any) =>
  apiFetch('/api/services/', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateService = (id: number | string, data: any) =>
  apiFetch(`/api/services/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
export const apiDeleteService = (id: number | string) =>
  apiFetch(`/api/services/${id}/`, { method: 'DELETE' });

// ── TRADES ───────────────────────────────────────────────

export const apiGetTrades = (params = '') =>
  apiFetch(`/api/trades/${params ? '?' + params : ''}`);
export const apiCreateTrade = (data: any) =>
  apiFetch('/api/trades/', { method: 'POST', body: JSON.stringify(data) });
export const apiUpdateTradeStatus = (id: number | string, status: string) =>
  apiFetch(`/api/trades/${id}/status/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// ── CONVERSATIONS ────────────────────────────────────────

export const apiGetConversations = () => apiFetch('/api/conversations/');
export const apiGetConversation = (id: number | string) =>
  apiFetch(`/api/conversations/${id}/`);
export const apiCreateConversation = (participantIds: number[]) =>
  apiFetch('/api/conversations/', {
    method: 'POST',
    body: JSON.stringify({ participant_ids: participantIds }),
  });
export const apiSendMessage = (convId: number | string, content: string) =>
  apiFetch(`/api/conversations/${convId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
export const apiMarkConversationRead = (convId: number | string) =>
  apiFetch(`/api/conversations/${convId}/read/`, { method: 'PATCH' });

// ── REVIEWS ──────────────────────────────────────────────

export const apiGetReviews = (params = '') =>
  apiFetch(`/api/reviews/${params ? '?' + params : ''}`);
export const apiCreateReview = (data: any) =>
  apiFetch('/api/reviews/', { method: 'POST', body: JSON.stringify(data) });

// ── ADMIN ─────────────────────────────────────────────────

export const apiAdminGetStats = () => apiFetch('/api/admin/stats/');
export const apiAdminGetUsers = (params = '') =>
  apiFetch(`/api/admin/users/${params ? '?' + params : ''}`);
export const apiAdminUpdateUser = (id: number | string, data: any) =>
  apiFetch(`/api/admin/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
export const apiAdminDeleteUser = (id: number | string) =>
  apiFetch(`/api/admin/users/${id}/`, { method: 'DELETE' });
export const apiAdminActivateUser = (id: number | string) =>
  apiFetch(`/api/admin/users/${id}/activate/`, { method: 'PATCH' });
