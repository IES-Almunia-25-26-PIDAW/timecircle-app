import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect } from 'vitest';

import { AppProvider, useApp } from '../app/context/AppContext';
import * as endpoints from '../app/api/endpoints';
import * as Toasts from '../app/components/Toasts';

const Grabber: React.FC<{ onReady: (ctx: any) => void }> = ({ onReady }) => {
  const ctx = useApp();
  React.useEffect(() => { onReady(ctx); }, [ctx]);
  return null;
};

describe('AppContext actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('createTrade handles trade+conversation+message+warning', async () => {
    const tradeCreated = { id: 123, service: 5, offerer: 6, requester: 7, status: 'pending', scheduled_date: '2023-06-01T00:00:00Z', created_at: '2023-05-01T00:00:00Z', credits_amount: 1 } as any;
    const conversation = { id: 99, participants: [1,2], last_message: 'hello', last_timestamp: 't', unread_count: 0 } as any;
    const message = { id: 500, sender: 6, content: 'hi', timestamp: 't' } as any;

    vi.spyOn(endpoints, 'apiCreateTrade').mockResolvedValue({ trade: tradeCreated, conversation, message, warning: 'Be careful' });
    const pushToastSpy = vi.spyOn(Toasts, 'pushToast').mockImplementation(() => {});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions).toBeTruthy());

    const result = await actions.createTrade({ serviceId: '5', scheduledDate: '2023-06-01', creditsAmount: 1 } as any);
    expect(result).toBeTruthy();
    expect(pushToastSpy).toHaveBeenCalledWith('Be careful', 'info');

    // the message should be available via getConversationMessages (wait for state to update)
    await waitFor(() => {
      const msgs = actions.getConversationMessages(String(conversation.id));
      expect(msgs.some((m: any) => m.id === String(message.id))).toBe(true);
    });
  });

  test('negotiateTrade sends proper payload fields', async () => {
    const negotiated = { id: 321, service: 5, status: 'pending', created_at: '2023-05-01T00:00:00Z' } as any;
    const spyNeg = vi.spyOn(endpoints, 'apiNegotiateTrade').mockResolvedValue(negotiated);

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions).toBeTruthy());

    const mapped = await actions.negotiateTrade('10', { scheduledDate: '2023-07-01', creditsAmount: 2, message: 'hey' } as any);
    expect(mapped).toBeTruthy();
    expect(spyNeg).toHaveBeenCalledWith('10', expect.objectContaining({ scheduled_date: new Date('2023-07-01').toISOString(), credits_amount: 2, message: 'hey' }));
  });

  test('requestStart and confirmStart call API and show toasts', async () => {
    vi.spyOn(endpoints, 'apiRequestTradeStart').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiConfirmTradeStart').mockResolvedValue({});
    vi.spyOn(endpoints, 'apiGetTrades').mockResolvedValue([]);
    const pushToastSpy = vi.spyOn(Toasts, 'pushToast').mockImplementation(() => {});

    let actions: any = null;
    render(
      <AppProvider>
        <Grabber onReady={(ctx) => { actions = ctx; }} />
      </AppProvider>
    );

    await waitFor(() => expect(actions).toBeTruthy());

    await actions.requestStart('77');
    expect(pushToastSpy).toHaveBeenCalledWith('Inicio solicitado. Esperando confirmación de la otra parte.', 'info');

    await actions.confirmStart('77');
    expect(pushToastSpy).toHaveBeenCalledWith('Inicio confirmado. La actividad está en curso.', 'success');
  });
});
