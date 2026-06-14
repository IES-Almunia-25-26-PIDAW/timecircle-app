import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

// Use Vitest's mocking — must be declared before importing AppContext
vi.mock('../app/api/endpoints', () => ({
  apiLogin: vi.fn(async () => ({ access: 'token', user: { id: 1, username: 'u' } })),
  apiLogout: vi.fn(),
  apiRegister: vi.fn(async () => ({ tokens: { access: 'token' }, user: { id: 2, username: 'r' } })),
  apiGetMe: vi.fn(async () => ({ id: 1, username: 'u' })),
  apiUpdateMe: vi.fn(async () => ({})),
  apiGetUsers: vi.fn(async () => []),
  apiGetCategories: vi.fn(async () => []),
  apiGetTags: vi.fn(async () => []),
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
      <button data-testid="register" onClick={() => { app.register('Name Test', 'a@b.com', 'pass'); }}>Register</button>
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
    const { apiCreateConversation } = await import('../app/api/endpoints');
    vi.mocked(apiCreateConversation).mockRejectedValueOnce(new Error('Network error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let appContext!: ReturnType<typeof useApp>;
    const Capture: React.FC = () => {
      appContext = useApp();
      return <div data-testid="ready">{appContext.currentUser ? 'logged-in' : 'guest'}</div>;
    };

    render(
      <AppProvider>
        <Capture />
      </AppProvider>
    );

    // Log in so currentUser is populated, otherwise startConversation
    // returns '' early before ever reaching apiCreateConversation
    await act(async () => {
      await appContext.login('u', 'pass');
    });
    await waitFor(() =>
      expect(screen.getByTestId('ready').textContent).toBe('logged-in')
    );

    const result = await act(async () => appContext.startConversation('999'));

    expect(result).toBe('');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Start conversation error',
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

it('handles adminDeleteUser errors', async () => {
  const { apiAdminDeleteUser } = await import('../app/api/endpoints');
  vi.mocked(apiAdminDeleteUser).mockRejectedValueOnce(new Error('Forbidden'));

  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  let appContext!: ReturnType<typeof useApp>;
  const Capture: React.FC = () => {
    appContext = useApp();
    return null;
  };

  render(
    <AppProvider>
      <Capture />
    </AppProvider>
  );

  await waitFor(() => expect(appContext).toBeDefined());

  // Should not throw — error is caught internally
  await act(async () => {
    await appContext.adminDeleteUser('42');
  });

  expect(consoleSpy).toHaveBeenCalledWith(
    'Admin delete user error',
    expect.any(Error),
  );

  consoleSpy.mockRestore();
});

it('handles adminUpdateUser errors', async () => {
  const { apiAdminUpdateUser } = await import('../app/api/endpoints');
  vi.mocked(apiAdminUpdateUser).mockRejectedValueOnce(new Error('Forbidden'));

  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  let appContext!: ReturnType<typeof useApp>;
  const Capture: React.FC = () => {
    appContext = useApp();
    return null;
  };

  render(
    <AppProvider>
      <Capture />
    </AppProvider>
  );

  await waitFor(() => expect(appContext).toBeDefined());

  await act(async () => {
    await appContext.adminUpdateUser('42', { credits: 10 });
  });

  expect(consoleSpy).toHaveBeenCalledWith(
    'Admin update user error',
    expect.any(Error),
  );

  consoleSpy.mockRestore();
});

it('handles addReview errors', async () => {
  const { apiCreateReview } = await import('../app/api/endpoints');
  vi.mocked(apiCreateReview).mockRejectedValueOnce(new Error('Unprocessable'));

  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  let appContext!: ReturnType<typeof useApp>;
  const Capture: React.FC = () => {
    appContext = useApp();
    return null;
  };

  render(
    <AppProvider>
      <Capture />
    </AppProvider>
  );

  await waitFor(() => expect(appContext).toBeDefined());

  await act(async () => {
    await appContext.addReview({
      tradeId: '1',
      reviewerId: '1',
      revieweeId: '2',
      rating: 5,
      comment: 'Great!',
    });
  });

  expect(consoleSpy).toHaveBeenCalledWith(
    'Add review error',
    expect.any(Error),
  );

  consoleSpy.mockRestore();
});

  it('handles requestLocation without geolocation by checking "in" operator', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let appContext!: ReturnType<typeof useApp>;
    const Capture: React.FC = () => {
      appContext = useApp();
      return null;
    };

    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(navigator),
      'geolocation',
    );

    // Delete from the prototype so `'geolocation' in navigator` is false
    delete Object.getPrototypeOf(navigator).geolocation;

    render(
      <AppProvider>
        <Capture />
      </AppProvider>
    );

    await waitFor(() => expect(appContext).toBeDefined());

    await act(async () => {
      await appContext.requestLocation();
    });

    // Guard returned early — no geolocation API touched, nothing logged
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    // Restore the prototype property
    if (originalDescriptor) {
      Object.defineProperty(
        Object.getPrototypeOf(navigator),
        'geolocation',
        originalDescriptor,
      );
    }

    consoleWarnSpy.mockRestore();
  });

  it('handles requestLocation geolocation error callback', async () => {
    const mockGetCurrentPosition = vi.fn((_success, error) => {
      error(new Error('Permission denied'));
    });

    const originalDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(navigator),
      'geolocation',
    );
    Object.defineProperty(Object.getPrototypeOf(navigator), 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      configurable: true,
    });

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let appContext!: ReturnType<typeof useApp>;
    const Capture: React.FC = () => {
      appContext = useApp();
      return <div data-testid="banner">{String(appContext.showLocationBanner)}</div>;
    };

    render(
      <AppProvider>
        <Capture />
      </AppProvider>
    );

    await waitFor(() => expect(appContext).toBeDefined());

    await act(async () => {
      await appContext.requestLocation();
    });

    // Error callback sets showLocationBanner = true
    expect(screen.getByTestId('banner').textContent).toBe('true');
    // getCurrentPosition is called at least once by requestLocation
    // (may also be called by AppProvider's auto-prompt useEffect on mount)
    expect(mockGetCurrentPosition).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
    if (originalDescriptor) {
      Object.defineProperty(
        Object.getPrototypeOf(navigator),
        'geolocation',
        originalDescriptor,
      );
    }
  });

  it('handles markConversationRead errors', async () => {
    const { apiMarkConversationRead } = await import('../app/api/endpoints');
    vi.mocked(apiMarkConversationRead).mockRejectedValueOnce(new Error('Server error'));

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let appContext!: ReturnType<typeof useApp>;
    const Capture: React.FC = () => {
      appContext = useApp();
      return null;
    };

    render(
      <AppProvider>
        <Capture />
      </AppProvider>
    );

    await waitFor(() => expect(appContext).toBeDefined());

    // Should not throw — error is caught internally
    await act(async () => {
      await appContext.markConversationRead('conv-1');
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Mark conversation read failed',
      expect.any(Error),
    );

    consoleWarnSpy.mockRestore();
  });

  it('handles refreshUnread errors', async () => {
    const { apiGetConversations } = await import('../app/api/endpoints');

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let appContext!: ReturnType<typeof useApp>;
    const Capture: React.FC = () => {
      appContext = useApp();
      return null;
    };

    render(
      <AppProvider>
        <Capture />
      </AppProvider>
    );

    await act(async () => {
      await appContext.login('u', 'pass');
    });
    await waitFor(() => expect(appContext.currentUser).not.toBeNull());

    const realDateNow = Date.now;
    vi.spyOn(Date, 'now').mockReturnValue(realDateNow() + 10_000);

    vi.mocked(apiGetConversations).mockRejectedValueOnce(new Error('Network error'));

    // Should resolve without throwing — fetchConversations catches internally
    await expect(
      act(async () => { await appContext.refreshUnread(); })
    ).resolves.not.toThrow();

    // The error surfaces in fetchConversations' own catch block
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching conversations',
      expect.any(Error),
    );

    vi.spyOn(Date, 'now').mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
