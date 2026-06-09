import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, expect } from 'vitest';

// Mock canRequestStart used by ActiveTradeActions
vi.mock('../../app/utils/tradeHelpers', () => ({
  canRequestStart: vi.fn(() => ({ allowed: true })),
}));

import { parseSelected, isOverlap, validateBookingParams, BookingForm, ActiveTradeActions } from '../../app/pages/ServiceDetail';

describe('ServiceDetail helpers and subcomponents', () => {
  it('parseSelected parses date and time correctly', () => {
    const d = parseSelected('2026-06-09', '14:30');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5); // June -> 5
    expect(d.getDate()).toBe(9);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it('validateBookingParams returns errors for missing date/time and invalid credits', () => {
    const service: any = { credits: 1, duration: 60, type: 'offer', id: 's1' };
    const noDate = validateBookingParams('', '10:00', '', service, null, [], () => null);
    expect((noDate as any).error).toBeTruthy();

    const noTime = validateBookingParams('2026-06-10', '', '', service, null, [], () => null);
    expect((noTime as any).error).toBeTruthy();

    const serviceZero: any = { credits: 0, duration: 60, type: 'offer', id: 's1' };
    const badCredits = validateBookingParams('2026-06-10', '10:00', 0, serviceZero, { id: 'u1', credits: 5 }, [], () => null);
    expect((badCredits as any).error).toMatch(/al menos 1/i);
  });

  it('validateBookingParams detects insufficient credits and same-service reservation', () => {
    const service: any = { credits: 2, duration: 60, type: 'offer', id: 's1' };
    const user: any = { id: 'u1', credits: 1, isAdmin: false };
    const insufficient = validateBookingParams('2026-06-10', '10:00', 5, service, user, [], () => null);
    expect((insufficient as any).error).toMatch(/No tienes suficientes créditos/i);

    const trades = [{ serviceId: 's1', status: 'pending', requesterId: 'u1' }];
    const same = validateBookingParams('2026-06-10', '10:00', '', service, { id: 'u1', credits: 10 }, trades as any, () => null);
    expect((same as any).error).toMatch(/Ya tienes una reserva activa/i);
  });

  it('validateBookingParams allows booking when user has exactly required credits', () => {
    const service: any = { credits: 2, duration: 60, type: 'offer', id: 's1' };
    const user: any = { id: 'u1', credits: 2, isAdmin: false };
    const result = validateBookingParams('2026-06-10', '10:00', 2, service, user, [], () => null);
    expect((result as any).error).toBeFalsy();
  });

  it('isOverlap detects overlapping trades', () => {
    const selected = new Date('2026-06-10T10:00:00');
    const selectedEnd = new Date(selected.getTime() + 60 * 60000);
    const myTrades = [{ scheduledDate: new Date('2026-06-10T10:30:00').toISOString(), serviceId: 's1', status: 'accepted' }];
    const getServiceById = (_: string) => ({ duration: 60 });
    expect(isOverlap(selected, selectedEnd, myTrades as any, getServiceById as any)).toBe(true);
  });

  it('BookingForm shows error and loading state', () => {
    render(
      <BookingForm
        scheduledDate=""
        scheduledTime="10:00"
        setScheduledDate={() => {}}
        setScheduledTime={() => {}}
        creditsAmount={''}
        setCreditsAmount={() => {}}
        notes={''}
        setNotes={() => {}}
        minDateStr={'2026-06-09'}
        bookError={'hubo un error'}
        booking={true}
        onConfirm={() => {}}
        service={{ credits: 1, duration: 60 }}
      />
    );

    expect(screen.getByText(/hubo un error/i)).toBeTruthy();
    expect(screen.getByRole('button')).toHaveTextContent(/Enviando/i);
  });

  it('ActiveTradeActions renders correct controls for statuses', () => {
    const req = vi.fn();
    const conf = vi.fn();
    const reqEnd = vi.fn();
    const confEnd = vi.fn();

    // null -> nothing
    const { container, rerender } = render(
      <ActiveTradeActions myActiveTrade={null} currentUser={{ id: '1' }} handleRequestStart={req} handleConfirmStart={conf} handleRequestEnd={reqEnd} handleConfirmEnd={confEnd} />
    );
    expect(container.innerHTML).toBe('');

    // accepted, not started -> Solicitar inicio
    rerender(
      <ActiveTradeActions myActiveTrade={{ status: 'accepted', startedAt: undefined }} currentUser={{ id: '1' }} handleRequestStart={req} handleConfirmStart={conf} handleRequestEnd={reqEnd} handleConfirmEnd={confEnd} />
    );
    expect(screen.getByText(/Solicitar inicio/i)).toBeTruthy();

    // in_progress -> Solicitar fin + Confirmar fin
    rerender(
      <ActiveTradeActions myActiveTrade={{ status: 'in_progress' }} currentUser={{ id: '1' }} handleRequestStart={req} handleConfirmStart={conf} handleRequestEnd={reqEnd} handleConfirmEnd={confEnd} />
    );
    expect(screen.getByText(/Solicitar fin/i)).toBeTruthy();
    expect(screen.getByText(/Confirmar fin/i)).toBeTruthy();
  });
});
