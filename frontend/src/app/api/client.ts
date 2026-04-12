const BASE_URL = import.meta.env.VITE_API_URL;

export const getTokens = () => ({
  access: localStorage.getItem('tc_access'),
  refresh: localStorage.getItem('tc_refresh'),
});

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('tc_access', access);
  localStorage.setItem('tc_refresh', refresh);
};

export const clearTokens = () => {
  localStorage.removeItem('tc_access');
  localStorage.removeItem('tc_refresh');
};

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const { access, refresh } = getTokens();

  const makeRequest = async (token: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${BASE_URL}${path}`, { ...options, headers });
  };

  let res = await makeRequest(access);

  if (res.status === 401 && refresh) {
    try {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setTokens(data.access, data.refresh || refresh);
        res = await makeRequest(data.access);
      } else {
        clearTokens();
        window.location.href = '/login';
        return null;
      }
    } catch {
      clearTokens();
      window.location.href = '/login';
      return null;
    }
  }

  if (res.status === 204) return null;

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Error desconocido' }));
    throw errData;
  }

  return res.json();
}
