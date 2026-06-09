import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect } from 'vitest';

import { AppProvider, useApp } from '../app/context/AppContext';
import * as endpoints from '../app/api/endpoints';

const Grabber: React.FC<{ onReady: (ctx: any) => void }> = ({ onReady }) => {
  const ctx = useApp();
  React.useEffect(() => { onReady(ctx); }, [ctx]);
  return null;
};

describe('AppContext additional branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  test('updateProfile with removeAvatar calls apiUpdateMe and refreshes user', async () => {
    // prepare a logged-in session via tokens so init runs
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');

    const meData = { id: 7, username: 'bob', first_name: 'Bob', last_name: 'B' } as any;

    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(meData);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    const updateSpy = vi.spyOn(endpoints, 'apiUpdateMe').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValueOnce(meData).mockResolvedValueOnce(meData);

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    // wait for init to set currentUser
    await waitFor(() => expect(actions.currentUser).not.toBeNull());

    await actions.updateProfile({ removeAvatar: true });

    expect(updateSpy).toHaveBeenCalled();
    // ensure avatar_image null was sent in payload when removeAvatar true
    const calledWith = updateSpy.mock.calls[0][0];
    expect(calledWith).toHaveProperty('avatar_image');
    expect(calledWith.avatar_image).toBeNull();
  });

  test('showConfirm resolves true on confirm and false on cancel', async () => {
    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions).toBeTruthy());

    const p = actions.showConfirm('Proceed?');
    // modal should appear with Confirmar/Cancelar
    const confirmBtn = await screen.findByText('Confirmar');
    fireEvent.click(confirmBtn);
    await expect(p).resolves.toBe(true);

    const p2 = actions.showConfirm('Proceed?');
    const cancelBtn = await screen.findByText('Cancelar');
    fireEvent.click(cancelBtn);
    await expect(p2).resolves.toBe(false);
  });

  test('adminDeleteUser removes user from users list', async () => {
    localStorage.setItem('tc_access', 'tok');
    localStorage.setItem('tc_refresh', 'ref');

    const meData = { id: 1, username: 'me' } as any;
    const users = [{ id: 9, username: 'victim' }];

    vi.spyOn(endpoints, 'apiGetMe').mockResolvedValue(meData);
    vi.spyOn(endpoints, 'apiGetCategories').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetUsers').mockResolvedValue({ results: users });
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetConversations').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetReviews').mockResolvedValue({ results: [] });
    vi.spyOn(endpoints, 'apiGetWSPresenceHandshake').mockResolvedValue({});

    const adminDelSpy = vi.spyOn(endpoints, 'apiAdminDeleteUser').mockResolvedValue({});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions.users.length).toBeGreaterThan(0));
    await actions.adminDeleteUser('9');

    await waitFor(() => expect(actions.users.find((u: any) => u.id === '9')).toBeUndefined());
    expect(adminDelSpy).toHaveBeenCalledWith('9');
  });
});
