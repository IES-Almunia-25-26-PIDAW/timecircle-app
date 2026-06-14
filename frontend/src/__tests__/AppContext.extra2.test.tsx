import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect } from 'vitest';

import { AppProvider, useApp } from '../app/context/AppContext';
import * as endpoints from '../app/api/endpoints';
import * as client from '../app/api/client';

const Grabber: React.FC<{ onReady: (ctx: any) => void }> = ({ onReady }) => {
  const ctx = useApp();
  React.useEffect(() => { onReady(ctx); }, [ctx]);
  return null;
};

describe('AppContext extra branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    // Ensure AppProvider sees an access token so init() calls apiGetMe
    localStorage.setItem('tc_access', 'test-access');
    localStorage.setItem('tc_refresh', 'test-refresh');
    // avoid accidental network calls by default
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTags').mockResolvedValue({ results: [] });
    const revieweeData = { id: 9, username: 'victim', rating: '4.5' };
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [revieweeData] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
  });

  test('markConversationRead sets unread and message read flags', async () => {
    const conv = { id: 55, participants: [1, 2], last_message: '', last_timestamp: '', unread_count: 2 };
    const convWithMessages = { id: 55, messages: [{ id: 300, sender: 2, content: 'x', timestamp: 't', read: false }] };
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [conv] });
    vi.spyOn(endpoints, 'apiGetConversation').mockResolvedValue(convWithMessages);
    const markSpy = vi.spyOn(endpoints, 'apiMarkConversationRead').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.currentUser).not.toBeNull());
    await actions.loadConversationMessages(String(conv.id));
    await waitFor(() => expect(actions.getConversationMessages(String(conv.id)).length).toBeGreaterThan(0));

    await actions.markConversationRead(String(conv.id));
    expect(markSpy).toHaveBeenCalledWith(String(conv.id));
    await waitFor(() => expect(actions.getConversationMessages(String(conv.id))[0].read).toBe(true));
    const c = actions.conversations.find((x: any) => x.id === String(conv.id));
    expect(c.unreadCount).toBe(0);
  });

  test('addReview posts review and refreshes reviewee user', async () => {
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 2, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTags').mockResolvedValue({ results: [] });
    const createdRev = { id: 77, trade: 1, reviewer: 2, reviewee: 9, rating: 5, comment: 'ok', created_at: '2023-01-01T00:00:00Z' };
    vi.spyOn(endpoints, 'apiCreateReview').mockResolvedValue(createdRev);
    const revieweeData = { id: 9, username: 'victim', rating: '4.5' };
    vi.spyOn(endpoints, 'apiGetUser').mockResolvedValue(revieweeData);

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.currentUser).not.toBeNull());
    await actions.addReview({ tradeId: '1', revieweeId: '9', reviewerId: '2', rating: 5, comment: 'ok' } as any);
    await waitFor(() => expect(actions.users.some((u: any) => u.id === String(revieweeData.id))).toBe(true));
  });

  test('adminUpdateUser and adminDeleteService exercise branches', async () => {
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 3, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [{ id: 50, username: 'u50' }] });
    vi.spyOn(endpoints, 'apiGetServices').mockResolvedValue({ results: [{ id: 200, title: 's' }] });

    const adminUpdateSpy = vi.spyOn(endpoints, 'apiAdminUpdateUser').mockResolvedValue({});
    const adminDeleteSvcSpy = vi.spyOn(endpoints, 'apiDeleteService').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.users.length).toBeGreaterThan(0));
    await actions.adminUpdateUser('50', { badge: 'gold', credits: 10 } as any);
    expect(adminUpdateSpy).toHaveBeenCalledWith('50', expect.any(Object));

    await waitFor(() => expect(actions.services.length).toBeGreaterThan(0));
    await actions.adminDeleteService('200');
    expect(adminDeleteSvcSpy).toHaveBeenCalledWith('200');
  });

  test('requestLocation success and failure branches', async () => {
    // success
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 4, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });

    const updateSpy = vi.spyOn(endpoints, 'apiUpdateMe').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValueOnce({ id: 4, username: 'me' }).mockResolvedValueOnce({ id: 4, username: 'me' });

    // mock geolocation
    const geo = { getCurrentPosition: (s: any) => s({ coords: { latitude: 1.1, longitude: 2.2 } }) } as any;
    (global as any).navigator.geolocation = geo;

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.currentUser).not.toBeNull());
    await actions.requestLocation();
    expect(updateSpy).toHaveBeenCalled();

    // failure path
    (global as any).navigator.geolocation = { getCurrentPosition: (_: any, err: any) => err() } as any;
    await actions.requestLocation();
    await waitFor(() => expect(actions.showLocationBanner).toBe(true));
  });

  test('updateProfile with avatarFile uses apiFetch and updates currentUser', async () => {
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 6, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });

    const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValueOnce({ id: 6, username: 'me' }).mockResolvedValueOnce({ id: 6, username: 'me-upd' });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.currentUser).not.toBeNull());

    const fakeFile = { name: 'a.png' } as any;
    await actions.updateProfile({ avatarFile: fakeFile } as any);
    expect(apiFetchSpy).toHaveBeenCalled();
    await waitFor(() => expect(actions.currentUser.name).toBe('me-upd'));
  });

  test('login success and failure branches', async () => {
    // failure
    vi.spyOn(endpoints, 'apiLogin').mockResolvedValue({});
    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );
    await waitFor(() => expect(actions).toBeTruthy());
    const ok = await actions.login('u', 'p');
    expect(ok).toBe(false);

    // success
    const user = { id: 8, username: 'ok' } as any;
    vi.spyOn(endpoints, 'apiLogin').mockResolvedValue({ access: 'a', user });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});
    const ok2 = await actions.login('u', 'p');
    expect(ok2).toBe(true);
  });

  test('startConversation with no currentUser returns empty string', async () => {
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(null);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions).toBeTruthy());
    const convId = await actions.startConversation('user2');
    expect(convId).toBe('');
  });

  test('totalUnreadMessages returns 0 when no currentUser', async () => {
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(null);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions).toBeTruthy());
    expect(actions.totalUnreadMessages).toBe(0);
  });

  test('refreshConversationMessages with empty messages array', async () => {
    const conv = { id: 55, participants: [1, 2], last_message: '', last_timestamp: '', unread_count: 0 };
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [conv] });
    vi.spyOn(endpoints, 'apiGetConversation').mockResolvedValue({ id: 55, messages: [] });

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.currentUser).not.toBeNull());
    await actions.refreshConversationMessages(String(conv.id));
    const msgs = actions.getConversationMessages(String(conv.id));
    expect(msgs.length).toBe(0);
  });

  test('refreshConversationMessages error handling', async () => {
    const conv = { id: 66, participants: [1, 2], last_message: '', last_timestamp: '', unread_count: 0 };
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [conv] });
    vi.spyOn(endpoints, 'apiGetConversation').mockRejectedValue(new Error('API error'));

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.currentUser).not.toBeNull());
    await actions.refreshConversationMessages(String(conv.id));
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Refresh conversation messages failed',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });

  test('markConversationRead error handling', async () => {
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 1, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiMarkConversationRead').mockRejectedValue(new Error('API error'));

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.currentUser).not.toBeNull());
    await actions.markConversationRead('conv-nonexistent');
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Mark conversation read failed',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });

  test('requestLocation with no currentUser skips update', async () => {
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(null);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });

    const updateSpy = vi.spyOn(endpoints, 'apiUpdateMe').mockResolvedValue({});

    const geo = { getCurrentPosition: (s: any) => s({ coords: { latitude: 1.1, longitude: 2.2 } }) } as any;
    (global as any).navigator.geolocation = geo;

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions).toBeTruthy());
    await actions.requestLocation();
    
    // Should not call updateMe when no currentUser
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test('requestLocation update error handling', async () => {
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue({ id: 5, username: 'me' } as any);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });

    vi.spyOn(endpoints, 'apiUpdateMe').mockRejectedValue(new Error('Update failed'));

    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const geo = { getCurrentPosition: (s: any) => s({ coords: { latitude: 1.1, longitude: 2.2 } }) } as any;
    (global as any).navigator.geolocation = geo;

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.currentUser).not.toBeNull());
    await actions.requestLocation();
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Request location update failed',
      expect.any(Error)
    );
    consoleWarnSpy.mockRestore();
  });
});
