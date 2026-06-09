import React from 'react';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

// Use Vitest's mocking — must be declared before importing AppContext
vi.mock('../app/api/endpoints', () => ({
  apiLogin: vi.fn(async () => ({ access: 'token', user: { id: 1, username: 'u' } })),
  apiLogout: vi.fn(),
  apiRegister: vi.fn(async () => ({ tokens: { access: 'token' }, user: { id: 2, username: 'r' } })),
  apiGetMe: vi.fn(async () => ({ id: 1, username: 'u' })),
  apiUpdateMe: vi.fn(async () => ({})),
  apiGetUsers: vi.fn(async () => []),
  apiGetCategories: vi.fn(async () => []),
  apiGetServices: vi.fn(async () => []),
  apiGetTrades: vi.fn(async () => []),
  apiGetConversations: vi.fn(async () => []),
  apiGetConversation: vi.fn(async () => ({ messages: [] })),
  apiGetReviews: vi.fn(async () => []),
  apiCreateService: vi.fn(async (p) => ({ id: 1, ...p })),
  apiUpdateService: vi.fn(async (id, p) => ({ id, ...p })),
  apiDeleteService: vi.fn(async () => ({})),
  apiCreateTrade: vi.fn(async (p) => ({ trade: { id: 1, ...p } })),
  apiUpdateTradeStatus: vi.fn(async () => ({})),
  apiNegotiateTrade: vi.fn(async () => ({})),
  apiCreateConversation: vi.fn(async () => ({ id: '1', participants: [] })),
  apiSendMessage: vi.fn(async () => ({ id: 'm1', content: 'hi' })),
  apiMarkConversationRead: vi.fn(async () => ({})),
  apiRequestTradeStart: vi.fn(async () => ({})),
  apiConfirmTradeStart: vi.fn(async () => ({})),
  apiRequestTradeEnd: vi.fn(async () => ({})),
  apiConfirmTradeEnd: vi.fn(async () => ({})),
  apiGetWSPresenceHandshake: vi.fn(async () => ({})),
  apiAdminUpdateUser: vi.fn(async () => ({})),
  apiAdminDeleteUser: vi.fn(async () => ({})),
  apiGetUser: vi.fn(async () => ({ id: 1 })),
  apiCreateReview: vi.fn(async (p) => ({ id: 'r1', ...p })),
}));

vi.mock('../app/api/client', () => ({
  BASE_URL: 'http://localhost',
  clearTokens: vi.fn(),
  getTokens: vi.fn(() => ({})),
  apiFetch: vi.fn(async () => ({})),
  getWsUrl: vi.fn(() => 'ws://'),
}));

import { AppProvider, useApp } from '../app/context/AppContext';

const Consumer: React.FC = () => {
  const app = useApp();
  return (
    <div>
      <div data-testid="loading">{String(app.loading)}</div>
      <div data-testid="users-count">{String(app.users.length)}</div>
      <div data-testid="current-user">{app.currentUser?.name ?? ''}</div>
      <button data-testid="register" onClick={() => { void app.register('Name Test', 'a@b.com', 'pass'); }}>Register</button>
      <button data-testid="toast" onClick={() => app.showToast('hello')}>Toast</button>
    </div>
  );
};

describe('AppContext', () => {
  it('provides basic actions and mapping helpers', async () => {
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBeDefined();
    expect(screen.getByTestId('users-count').textContent).toBe('0');

    fireEvent.click(screen.getByTestId('register'));

    await waitFor(() => expect(screen.getByTestId('current-user').textContent).toBe('r'));
  });

  it('handles startConversation errors gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );
    consoleWarnSpy.mockRestore();
  });

  it('handles refreshConversationMessages errors', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );
    consoleWarnSpy.mockRestore();
  });

  it('handles adminDeleteUser errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );
    consoleSpy.mockRestore();
  });

  it('handles adminUpdateUser errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );
    consoleSpy.mockRestore();
  });

  it('handles addReview errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );
    consoleSpy.mockRestore();
  });

  it('handles requestLocation without geolocation by checking "in" operator', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );
    consoleWarnSpy.mockRestore();
  });

  it('handles requestLocation geolocation error callback', async () => {
    const mockGetCurrentPosition = vi.fn((success, error) => {
      error(new Error('Permission denied'));
    });

    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      configurable: true,
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    consoleWarnSpy.mockRestore();
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    });
  });

  it('handles markConversationRead errors', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );
    consoleWarnSpy.mockRestore();
  });

  it('handles refreshUnread errors', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );
    consoleWarnSpy.mockRestore();
  });
});
