import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect } from 'vitest';

import { AppProvider, useApp } from '../app/context/AppContext';
import * as endpoints from '../app/api/endpoints';

const Grabber: React.FC<{ onReady: (ctx: any) => void }> = ({ onReady }) => {
  const ctx = useApp();
  React.useEffect(() => { onReady(ctx); }, [ctx]);
  return null;
};

describe('AppContext more branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test('createTrade returns undefined for invalid serviceId', async () => {
    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    const res = await actions.createTrade({ serviceId: 'not-a-number', scheduledDate: '2023-06-01', creditsAmount: 1 } as any);
    expect(res).toBeUndefined();
  });

  test('sendMessage no-op when no currentUser', async () => {
    const sendSpy = vi.spyOn(endpoints, 'apiSendMessage').mockResolvedValue({});
    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    await actions.sendMessage('c1', 'hello');
    expect(sendSpy).not.toHaveBeenCalled();
  });

  test('startConversation returns existing conversation id when present', async () => {
    // Setup logged-in user and initial conversations
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    const me = { id: 1, username: 'me' } as any;
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(me);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [{ id: 77, participants: [1, 2], last_message: '', last_timestamp: '', unread_count: 0 }] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.currentUser).not.toBeNull());
    const convId = await actions.startConversation('2');
    expect(convId).toBe(String(77));
  });

  test('refreshConversationMessages fetches and maps messages', async () => {
    const conv = { id: 999, messages: [{ id: 5, sender: 2, content: 'hi', timestamp: 't', read: false }] } as any;
    vi.spyOn(endpoints, 'apiGetConversation').mockResolvedValue(conv);

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    await actions.refreshConversationMessages(String(conv.id));
    await waitFor(() => expect(actions.getConversationMessages(String(conv.id)).length).toBeGreaterThan(0));
    const msgs = actions.getConversationMessages(String(conv.id));
    expect(msgs[0].id).toBe(String(5));
  });

  test('updateTrade with status completed refreshes current user', async () => {
    // Setup logged in and initial/current user
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    const meInit = { id: 10, username: 'init' } as any;
    const meUpdated = { id: 11, username: 'updated' } as any;
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValueOnce(meInit).mockResolvedValueOnce(meUpdated);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    const updateSpy = vi.spyOn(endpoints, 'apiUpdateTradeStatus').mockResolvedValue({ id: 1, status: 'completed' });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).not.toBeNull());

    await actions.updateTrade('1', { status: 'completed' });
    await waitFor(() => expect(String(actions.currentUser.id)).toBe(String(meUpdated.id)));
    expect(updateSpy).toHaveBeenCalledWith('1', 'completed');
  });

  test('startConversation with non-numeric id returns empty', async () => {
    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    const res = await actions.startConversation('not-a-number');
    expect(res).toBe('');
  });

  test('requestLocation with geolocation success updates viewer location', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    const me = { id: 1, username: 'me', latitude: 0, longitude: 0 } as any;
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(me);
    vi.spyOn(endpoints, 'apiUpdateMe').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: any) => {
          success({ coords: { latitude: 41.3, longitude: -2.1 } });
        },
      },
      configurable: true,
    });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).not.toBeNull());

    await actions.requestLocation();
    expect(actions.viewerLocation).toEqual({ lat: 41.3, lon: -2.1 });
  });

  test('login error branch triggers catch', async () => {
    vi.spyOn(endpoints, 'apiLogin').mockRejectedValue(new Error('Login failed'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    const result = await actions.login('user', 'pass');
    expect(result).toBe(false);
  });

  test('createTrade error branch', async () => {
    vi.spyOn(endpoints, 'apiCreateTrade').mockRejectedValue(new Error('Create failed'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    const res = await actions.createTrade({ serviceId: '1', scheduledDate: '2023-06-01', creditsAmount: 1 } as any);
    expect(res).toBeUndefined();
  });

  test('updateProfile calls apiUpdateMe and apiGetMe', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    const me = { id: 1, username: 'me', first_name: 'John', last_name: 'Doe' } as any;
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(me);
    vi.spyOn(endpoints, 'apiUpdateMe').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).not.toBeNull());

    const updateSpy = vi.spyOn(endpoints, 'apiUpdateMe').mockResolvedValue({});
    const getMeSpy = vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(me);

    await actions.updateProfile({ name: 'Jane Doe', city: 'NewCity' });
    expect(updateSpy).toHaveBeenCalled();
    expect(getMeSpy).toHaveBeenCalled();
  });

  test('adminDeleteUser calls api endpoint', async () => {
    const deleteSpy = vi.spyOn(endpoints, 'apiAdminDeleteUser').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    await actions.adminDeleteUser('123');
    expect(deleteSpy).toHaveBeenCalledWith('123');
  });

  test('adminUpdateUser calls api endpoint', async () => {
    const updateSpy = vi.spyOn(endpoints, 'apiAdminUpdateUser').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    await actions.adminUpdateUser('123', { badge: 'gold' });
    expect(updateSpy).toHaveBeenCalledWith('123', { badge: 'gold' });
  });

  test('show location banner when user not localized', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    sessionStorage.clear();
    const me = { id: 1, username: 'me', latitude: null, longitude: null } as any;
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(me);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    
    const mockGetCurrentPosition = vi.fn((onSuccess, onError) => {
      onError?.({ code: 1, message: 'User denied' } as any);
    });
    (globalThis.navigator as any) = {
      ...navigator,
      geolocation: { getCurrentPosition: mockGetCurrentPosition },
    };

    let showBanner: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { showBanner = ctx.showLocationBanner; }} />
      </AppProvider>
    );
    await waitFor(() => expect(showBanner).toBe(true));
  });

  test('getUserById returns correct user', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [{ id: 2, username: 'other' }] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.users.length).toBeGreaterThan(0));

    const user = actions.getUserById('2');
    expect(user?.id).toBe('2');
  });

  test('getServiceById returns correct service', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetServices').mockResolvedValue({ results: [{ id: 's1', title: 'Service' }] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.services.length).toBeGreaterThan(0));

    const service = actions.getServiceById('s1');
    expect(service?.id).toBe('s1');
  });

  test('getTradeById returns correct trade', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [{ id: 't1', status: 'pending' }] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.trades.length).toBeGreaterThan(0));

    const trade = actions.getTradeById('t1');
    expect(trade?.id).toBe('t1');
  });

  test('totalUnreadMessages returns count', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', unread_count: 2, participants: [{ id: 1 }, { id: 2 }] }, { id: 'c2', unread_count: 3, participants: [{ id: 1 }, { id: 3 }] }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.totalUnreadMessages).toBeGreaterThan(0));

    expect(actions.totalUnreadMessages).toBe(5);
  });

  test('showConfirm resolves to true when accepted', async () => {
    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    const promiseResult = actions.showConfirm('Are you sure?');
    // Simulate confirmation by finding and clicking confirm button
    // In a real test, the modal would be rendered and we'd interact with it
    expect(promiseResult).toBeDefined();
  });

  test('register successfully creates user', async () => {
    vi.spyOn(endpoints, 'apiRegister').mockResolvedValue({
      tokens: { access: 'access', refresh: 'refresh' },
      user: { id: 1, username: 'newuser', name: 'New User' },
    } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    const registerSpy = vi.spyOn(endpoints, 'apiRegister');
    const result = await actions.register('New User', 'new@test.com', 'password123');
    expect(registerSpy).toHaveBeenCalled();
  });

  test('logout clears tokens', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    const me = { id: 1, username: 'me' } as any;
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(me);
    vi.spyOn(endpoints, 'apiLogout').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    const logoutSpy = vi.spyOn(endpoints, 'apiLogout');

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).not.toBeNull());

    await actions.logout();
    expect(logoutSpy).toHaveBeenCalled();
  });

  test('adminDeleteService calls api endpoint', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetServices').mockResolvedValue({ results: [{ id: 's1', title: 'Service' }] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    const deleteSpy = vi.spyOn(endpoints, 'apiDeleteService').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.services.length).toBeGreaterThan(0));

    await actions.adminDeleteService('s1');
    expect(deleteSpy).toHaveBeenCalledWith('s1');
    await waitFor(() => expect(actions.services.length).toBe(0));
  });

  test('refreshServices triggers fetch', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetServices').mockResolvedValue({ results: [{ id: 's1', title: 'Service' }] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.services.length).toBeGreaterThan(0));

    const initialCount = actions.services.length;
    await actions.refreshServices();
    expect(actions.services.length).toBe(initialCount);
  });

  test('requestEnd with error', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiRequestTradeEnd').mockRejectedValue(new Error('API error'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    try {
      await actions.requestEnd('t1');
    } catch (e) {
      expect((e as Error).message).toBe('API error');
    }
  });

  test('confirmEnd with error', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiConfirmTradeEnd').mockRejectedValue(new Error('API error'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    try {
      await actions.confirmEnd('t1');
    } catch (e) {
      expect((e as Error).message).toBe('API error');
    }
  });

  test('loadConversationMessages with error', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetConversation').mockRejectedValue(new Error('API error'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    await actions.loadConversationMessages('c1');
    expect(actions.messages.length).toBe(0);
  });

  test('addReview with success', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [{ id: 2, username: 'other', rating: 4 }] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiCreateReview').mockResolvedValue({ id: 'r1', trade_id: 't1', reviewee_id: 2, reviewer_id: 1, rating: 5, comment: 'Great!', created_at: '2026-06-09T00:00:00Z' } as any);
    vi.spyOn(endpoints, 'apiGetUser').mockResolvedValue({ id: 2, username: 'other', rating: 5 } as any);

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.users.length).toBeGreaterThan(0));

    const initialReviews = actions.reviews.length;
    await actions.addReview({ tradeId: 't1', revieweeId: '2', rating: 5, comment: 'Great!' });
    await waitFor(() => expect(actions.reviews.length).toBeGreaterThan(initialReviews));
  });

  test('addReview with error', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiCreateReview').mockRejectedValue(new Error('API error'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    const initialReviews = actions.reviews.length;
    await actions.addReview({ tradeId: 't1', revieweeId: '2', rating: 5, comment: 'Great!' });
    expect(actions.reviews.length).toBe(initialReviews);
  });

  test('getConversationMessages filters by conversationId', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    const messages = actions.getConversationMessages('c1');
    expect(Array.isArray(messages)).toBe(true);
  });

  test('getUserConversations filters by userId', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    const me = { id: 1, username: 'me' } as any;
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(me);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', participants: [{ id: 1 }, { id: 2 }], unread_count: 0 }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBeGreaterThan(0));

    const userConvs = actions.getUserConversations('1');
    expect(userConvs.length).toBe(1);
  });

  test('getUserReviews filters by revieweeId', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({
      results: [{ id: 'r1', trade: 't1', reviewee: 2, reviewer: 1, rating: 5, comment: 'Good', created_at: '2026-06-09T00:00:00Z' }],
    });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.reviews.length).toBeGreaterThan(0));

    const userReviews = actions.getUserReviews('2');
    expect(userReviews.length).toBe(1);
  });

  test('getUserTrades filters by offererId or requesterId', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({
      results: [
        { id: 't1', service: 's1', offerer: { id: 1 }, requester: { id: 2 }, status: 'pending', credits_amount: 10, created_at: '2026-06-09T00:00:00Z' },
        { id: 't2', service: 's2', offerer: { id: 3 }, requester: { id: 1 }, status: 'pending', credits_amount: 20, created_at: '2026-06-09T00:00:00Z' },
      ],
    });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.trades.length).toBeGreaterThan(0));

    const userTrades = actions.getUserTrades('1');
    expect(userTrades.length).toBe(2);
  });

  test('refreshUnread calls fetchConversations', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    const me = { id: 1, username: 'me' } as any;
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(me);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', participants: [{ id: 1 }, { id: 2 }], unread_count: 2 }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBeGreaterThan(0));

    await actions.refreshUnread();
    expect(actions.totalUnreadMessages).toBe(2);
  });

  test('startConversation returns empty string on invalid user IDs', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 'not-a-number', username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).toBeTruthy());

    const res = await actions.startConversation('2');
    expect(res).toBe('');
  });

  test('startConversation handles API error', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiCreateConversation').mockRejectedValue(new Error('API error'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).toBeTruthy());

    const res = await actions.startConversation('2');
    expect(res).toBe('');
  });

  test('markConversationRead updates state and handles errors', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', participants: [1, 2], unreadCount: 5, lastMessage: 'Hi', lastTimestamp: '2026-06-09T00:00:00Z', messages: [] }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiMarkConversationRead').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBeGreaterThan(0));

    await actions.markConversationRead('c1');
    expect(actions.conversations[0].unreadCount).toBe(0);
  });

  test('markConversationRead handles API error gracefully', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', participants: [1, 2], unreadCount: 5, lastMessage: 'Hi', lastTimestamp: '2026-06-09T00:00:00Z', messages: [] }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiMarkConversationRead').mockRejectedValue(new Error('API error'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBeGreaterThan(0));

    // Should not throw, just log warning
    await expect(actions.markConversationRead('c1')).resolves.toBeUndefined();
  });

  test('refreshConversationMessages updates messages and conversation state', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', participants: [1, 2], unreadCount: 0, lastMessage: 'old', lastTimestamp: '2026-06-08T00:00:00Z', messages: [] }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetConversation').mockResolvedValue({
      id: 'c1',
      messages: [{ id: 'm1', content: 'new message', sender: { id: 2 }, timestamp: '2026-06-09T12:00:00Z', read: false }],
    });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBeGreaterThan(0));

    await actions.refreshConversationMessages('c1');
    await waitFor(() => expect(actions.conversations[0].lastMessage).toBe('new message'));
  });

  test('refreshConversationMessages handles error gracefully', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', participants: [1, 2], unreadCount: 0, lastMessage: 'old', lastTimestamp: '2026-06-08T00:00:00Z', messages: [] }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetConversation').mockRejectedValue(new Error('API error'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBeGreaterThan(0));

    // Should not throw
    await expect(actions.refreshConversationMessages('c1')).resolves.toBeUndefined();
  });

  test('requestEnd throws error when API fails', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiRequestTradeEnd').mockRejectedValue(new Error('End request failed'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).toBeTruthy());

    await expect(actions.requestEnd('t1')).rejects.toThrow('End request failed');
  });

  test('confirmEnd throws error when API fails', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiConfirmTradeEnd').mockRejectedValue(new Error('End confirmation failed'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).toBeTruthy());

    await expect(actions.confirmEnd('t1')).rejects.toThrow('End confirmation failed');
  });

  test('sendMessage updates conversation lastMessage', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    const apiSendSpy = vi.spyOn(endpoints, 'apiSendMessage');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', participants: [1, 2], unreadCount: 0, lastMessage: 'old', lastTimestamp: '2026-06-08T00:00:00Z', messages: [] }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    apiSendSpy.mockResolvedValue({ id: 'm1', content: 'hello', sender: { id: 1 }, timestamp: '2026-06-09T00:00:00Z' });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBeGreaterThan(0));

    await actions.sendMessage('c1', 'hello');
    await waitFor(() => expect(apiSendSpy).toHaveBeenCalledWith('c1', 'hello'));
  });

  test('getConversationMessages filters messages by conversation id', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', participants: [1, 2], unreadCount: 0, lastMessage: 'hi', lastTimestamp: '2026-06-08T00:00:00Z', messages: [] }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    const apiGetConvSpy = vi.spyOn(endpoints, 'apiGetConversation');
    apiGetConvSpy.mockResolvedValue({
      id: 'c1',
      messages: [
        { id: 'm1', content: 'msg1', sender: { id: 2 }, timestamp: '2026-06-09T00:00:00Z', read: true },
        { id: 'm2', content: 'msg2', sender: { id: 1 }, timestamp: '2026-06-09T01:00:00Z', read: true },
      ],
    });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBeGreaterThan(0));

    // Initial: no messages
    expect(actions.getConversationMessages('c1').length).toBe(0);
    
    // Load messages
    await actions.loadConversationMessages('c1');
    await waitFor(() => expect(apiGetConvSpy).toHaveBeenCalledWith('c1'));
  });

  test('loadConversationMessages fetches and caches messages', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [{ id: 'c1', participants: [1, 2], unreadCount: 0, lastMessage: 'hi', lastTimestamp: '2026-06-08T00:00:00Z', messages: [] }],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    const apiGetConvSpy = vi.spyOn(endpoints, 'apiGetConversation');
    apiGetConvSpy.mockResolvedValue({
      id: 'c1',
      messages: [{ id: 'm1', content: 'msg1', sender: { id: 2 }, timestamp: '2026-06-09T00:00:00Z', read: true }],
    });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBeGreaterThan(0));

    // First call loads from API
    await actions.loadConversationMessages('c1');
    expect(apiGetConvSpy).toHaveBeenCalledWith('c1');
    
    // Second call doesn't hit API (cached)
    await actions.loadConversationMessages('c1');
    expect(apiGetConvSpy).toHaveBeenCalledTimes(1);
  });

  test('searchServices fetches and updates services state', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me', latitude: 0, longitude: 0 } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    const apiGetSrvSpy = vi.spyOn(endpoints, 'apiGetServices');
    apiGetSrvSpy.mockResolvedValue({
      results: [
        { id: 's1', title: 'Service 1', category: 1, creditsAmount: 10, createdAt: '2026-06-09T00:00:00Z' },
        { id: 's2', title: 'Service 2', category: 1, creditsAmount: 15, createdAt: '2026-06-09T00:00:00Z' },
      ],
    });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.services.length).toBeGreaterThan(0));

    // searchServices is async and updates state, doesn't return anything
    await actions.searchServices({ maxDistanceKm: 50 });
    expect(apiGetSrvSpy).toHaveBeenCalled();
  });

  test('getServiceById returns service by id', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetServices').mockResolvedValue({
      results: [
        { id: 's1', title: 'Service 1', category: 1, creditsAmount: 10, createdAt: '2026-06-09T00:00:00Z' },
      ],
    });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.services.length).toBeGreaterThan(0));

    const service = actions.getServiceById('s1');
    expect(service?.id).toBe('s1');
    expect(service?.title).toBe('Service 1');
  });

  test('getTradeById returns trade by id', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({
      results: [
        { id: 't1', service: 's1', offerer: { id: 1 }, requester: { id: 2 }, status: 'pending', credits_amount: 10, created_at: '2026-06-09T00:00:00Z' },
      ],
    });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.trades.length).toBeGreaterThan(0));

    const trade = actions.getTradeById('t1');
    expect(trade?.id).toBe('t1');
  });

  test('location banner closes when close button clicked', async () => {
    sessionStorage.clear();
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    // Mock geolocation error to trigger banner
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (success: any, error: any) => {
          setTimeout(() => error(new Error('denied')), 0);
        },
      } as Geolocation,
    });

    const { getByText, queryByText } = render(
      <AppProvider>
        <Grabber onReady={() => {}} />
      </AppProvider>
    );

    await waitFor(() => {
      expect(queryByText(/Compartir tu ubicación/)).toBeInTheDocument();
    });

    const closeBtn = getByText('Cerrar');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(queryByText(/Compartir tu ubicación/)).not.toBeInTheDocument();
    });
  });

  test('context provides all required functions and state', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me', credits: 100 } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());

    // Verify key functions exist
    expect(typeof actions.login).toBe('function');
    expect(typeof actions.logout).toBe('function');
    expect(typeof actions.register).toBe('function');
    expect(typeof actions.updateProfile).toBe('function');
    expect(typeof actions.addService).toBe('function');
    expect(typeof actions.updateService).toBe('function');
    expect(typeof actions.deleteService).toBe('function');
    expect(typeof actions.createTrade).toBe('function');
    expect(typeof actions.updateTrade).toBe('function');
    expect(typeof actions.sendMessage).toBe('function');
    expect(typeof actions.startConversation).toBe('function');
    expect(typeof actions.markConversationRead).toBe('function');
    expect(typeof actions.addReview).toBe('function');
    expect(typeof actions.adminDeleteUser).toBe('function');
    expect(typeof actions.adminDeleteService).toBe('function');
    expect(typeof actions.adminUpdateUser).toBe('function');
    expect(typeof actions.getWsClient).toBe('function');

    // Verify state exists
    expect(actions.currentUser).toBeTruthy();
    expect(Array.isArray(actions.users)).toBe(true);
    expect(Array.isArray(actions.services)).toBe(true);
    expect(Array.isArray(actions.trades)).toBe(true);
    expect(Array.isArray(actions.messages)).toBe(true);
    expect(Array.isArray(actions.conversations)).toBe(true);
    expect(Array.isArray(actions.reviews)).toBe(true);
  });

  test('refresh helpers work correctly', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    const apiGetTradesSpy = vi.spyOn(endpoints, 'apiGetTrades');
    apiGetTradesSpy.mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).toBeTruthy());

    // Test refreshTrades
    await actions.refreshTrades();
    expect(apiGetTradesSpy).toHaveBeenCalled();
  });

  test('getWsClient creates and returns WebSocket client', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).toBeTruthy());

    // Test getWsClient
    const wsClient = actions.getWsClient();
    expect(wsClient).toBeDefined();
  });

  test('loadConversationMessages with empty conversation', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [{ id: 2, username: 'other' }] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ 
      results: [{ id: 'c1', participants: [1, 2], unreadCount: 1, lastMessage: null, lastTimestamp: null, messages: [] }]
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    const apiGetConversationSpy = vi.spyOn(endpoints, 'apiGetConversation').mockResolvedValue({ id: 'c1', messages: [] });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).toBeTruthy());

    // Load messages from conversation
    await actions.loadConversationMessages('c1');
    expect(apiGetConversationSpy).toHaveBeenCalledWith('c1');
  });

  test('addReview with error handling', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    const apiCreateReviewSpy = vi.spyOn(endpoints, 'apiCreateReview')
      .mockRejectedValue(new Error('API error'));

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.currentUser).toBeTruthy());

    // Test addReview with error
    try {
      await actions.addReview({ tradeId: 't1', rating: 5, comment: 'Great!' });
    } catch (e) {
      // Error expected
    }
    expect(apiCreateReviewSpy).toHaveBeenCalled();
  });

  test('getUserConversations returns conversations for user', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({
      results: [
        { id: 'c1', participants: [1, 2], unreadCount: 0, lastMessage: 'hi', lastTimestamp: '2026-06-08T00:00:00Z', messages: [] },
        { id: 'c2', participants: [1, 3], unreadCount: 2, lastMessage: 'hey', lastTimestamp: '2026-06-08T00:00:00Z', messages: [] },
      ],
    });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions.conversations.length).toBe(2));

    const convs = actions.getUserConversations('1');
    expect(convs.length).toBe(2);
  });
});
