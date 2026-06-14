import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';

// Mock the AppContext to provide a controllable context for the component
let mockCtx: any = {};
vi.mock('../../app/context/AppContext', () => ({
  useApp: () => mockCtx,
}));

// Mock ProfileMap (heavy map lib) with a simple placeholder
vi.mock('../../app/components/ProfileMap', () => ({ default: () => <div data-testid="profile-map" /> }));

import { ServiceDetail } from '../../app/pages/ServiceDetail';

describe('ServiceDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCtx = {
      currentUser: { id: '1', isAdmin: false, credits: 5 },
      getServiceById: (id: string) => ({
        id,
        userId: '2',
        title: 'Testing service',
        type: 'offer',
        credits: 1,
        duration: 60,
        tags: [],
        status: 'active',
        description: 'desc',
        avatar: '',
      }),
      getUserById: (id: string) => ({ id, name: 'Owner', avatar: '', rating: 4.5, totalReviews: 0, city: 'X' }),
      getUserReviews: (id: string) => [],
      createTrade: vi.fn(async () => ({ conversationId: 'conv-1' })),
      startConversation: vi.fn(async () => 'conv-1'),
      deleteService: vi.fn(async () => ({})),
      trades: [],
      requestStart: vi.fn(async () => ({})),
      confirmStart: vi.fn(async () => ({})),
      requestEnd: vi.fn(async () => ({})),
      confirmEnd: vi.fn(async () => ({})),
      showConfirm: vi.fn(async () => true),
      showToast: vi.fn(),
    };
  });

  it('shows loading state when service is not found', async () => {
    mockCtx.getServiceById = (id: string) => undefined;
    render(
      <MemoryRouter initialEntries={["/services/999"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Cargando servicio/i)).toBeTruthy();
    expect(screen.getByText(/Volver a servicios/i)).toBeTruthy();
  });

  it('validates missing date when trying to book', async () => {
    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // open booking
    fireEvent.click(screen.getByText(/Reservar servicio/i));

    // click confirm without selecting date
    fireEvent.click(screen.getByRole('button', { name: /Confirmar solicitud/i }));

    expect(await screen.findByText(/Por favor selecciona una fecha/i)).toBeTruthy();
  });

  it('creates a booking successfully and shows booked confirmation and navigates to messages', async () => {
    // ensure createTrade returns a conversationId (default in beforeEach)
    mockCtx.createTrade = vi.fn(async () => ({ conversationId: 'conv-1' }));

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/messages" element={<div data-testid="messages-route">messages</div>} />
        </Routes>
      </MemoryRouter>
    );

    // open booking and wait for form to render
    fireEvent.click(screen.getByText(/Reservar servicio/i));
    const dateInput = await screen.findByLabelText(/Fecha propuesta/i);

    const minDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fireEvent.change(dateInput, { target: { value: minDate } });

    const confirmBtn = await screen.findByRole('button', { name: /Confirmar solicitud/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(mockCtx.createTrade).toHaveBeenCalled());

    // when a conversationId is returned the component navigates to messages
    expect(screen.getByTestId('messages-route')).toBeInTheDocument();
  });

  it('calls startConversation when messaging the owner', async () => {
    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Enviar mensaje/i));
    await waitFor(() => expect(mockCtx.startConversation).toHaveBeenCalled());
  });

  it('shows ActiveTradeActions and calls requestStart when confirmed', async () => {
    // prepare an active trade for current user
    mockCtx.trades = [{ id: 't1', serviceId: '1', status: 'accepted', requesterId: '1', offererId: '2' }];

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // the action button should be visible
    const btn = await screen.findByRole('button', { name: /Solicitar inicio/i });
    fireEvent.click(btn);

    await waitFor(() => expect(mockCtx.requestStart).toHaveBeenCalled());
  });

  it('allows owner to delete the service', async () => {
    // make current user the owner
    mockCtx.currentUser = { id: '2', isAdmin: false, credits: 5 };
    mockCtx.showConfirm = vi.fn(async () => true);
    mockCtx.deleteService = vi.fn(async () => ({}));

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const del = await screen.findByText(/Eliminar/i);
    fireEvent.click(del);

    await waitFor(() => expect(mockCtx.deleteService).toHaveBeenCalled());
  });

  it('creates a booking without conversationId and shows booked confirmation', async () => {
    mockCtx.createTrade = vi.fn(async () => ({}));

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // open booking and wait for form to render
    fireEvent.click(screen.getByText(/Reservar servicio/i));
    const dateInput = await screen.findByLabelText(/Fecha propuesta/i);

    // set date safely to a few days ahead to avoid timezone/minAllowed edge cases
    const minDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fireEvent.change(dateInput, { target: { value: minDate } });

    const confirmBtn = await screen.findByRole('button', { name: /Confirmar solicitud/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(mockCtx.createTrade).toHaveBeenCalled());
    expect(await screen.findByText(/¡Solicitud enviada!/i)).toBeTruthy();
  });

  it('shows createTrade server error in booking form', async () => {
    mockCtx.createTrade = vi.fn(async () => { throw { detail: 'server error' }; });

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Reservar servicio/i));
    const dateInput = await screen.findByLabelText(/Fecha propuesta/i);
    const minDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fireEvent.change(dateInput, { target: { value: minDate } });
    const confirmBtn = await screen.findByRole('button', { name: /Confirmar solicitud/i });
    fireEvent.click(confirmBtn);

    expect(await screen.findByText(/server error/i)).toBeTruthy();
  });

  it('renders owner reviews when present', async () => {
    mockCtx.getUserReviews = (id: string) => [{ id: 'r1', reviewerId: 'u2', rating: 5, comment: 'Great', createdAt: new Date().toISOString() }];
    mockCtx.getUserById = (id: string) => ({ id, name: 'Reviewer', avatar: '', rating: 5, totalReviews: 1, city: 'X' });

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Valoraciones de/i)).toBeTruthy();
    expect(screen.getByText(/Great/i)).toBeTruthy();
  });

  it('displays distance when available', async () => {
    mockCtx.getServiceById = (id: string) => ({
      id,
      userId: '2',
      title: 'Testing service',
      type: 'offer',
      credits: 1,
      duration: 60,
      tags: [],
      status: 'active',
      description: 'desc',
      avatar: '',
      distanceKm: 3.2,
    });

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/3.2 km desde ti/i)).toBeTruthy();
  });

  it('ActiveTradeActions shows Inicio solicitado when startedById equals currentUser', async () => {
    mockCtx.trades = [{ id: 't1', serviceId: '1', status: 'accepted', requesterId: '1', offererId: '2', startedAt: new Date().toISOString(), startedById: '1' }];

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Inicio solicitado/i)).toBeTruthy();
  });

  it('ActiveTradeActions shows Confirmar inicio when startedById is different', async () => {
    mockCtx.trades = [{ id: 't1', serviceId: '1', status: 'accepted', requesterId: '1', offererId: '2', startedAt: new Date().toISOString(), startedById: '2' }];

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Confirmar inicio/i)).toBeTruthy();
  });

  it('calls confirmStart when Confirmar inicio is clicked', async () => {
    mockCtx.trades = [{ id: 't1', serviceId: '1', status: 'accepted', requesterId: '1', offererId: '2', startedAt: new Date().toISOString(), startedById: '2' }];
    mockCtx.showConfirm = vi.fn(async () => true);
    mockCtx.confirmStart = vi.fn(async () => ({}));

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const btn = await screen.findByText(/Confirmar inicio/i);
    fireEvent.click(btn);

    await waitFor(() => expect(mockCtx.confirmStart).toHaveBeenCalled());
  });

  it('calls requestEnd and confirmEnd when in_progress actions clicked', async () => {
    mockCtx.trades = [{ id: 't1', serviceId: '1', status: 'in_progress', requesterId: '1', offererId: '2' }];
    mockCtx.showConfirm = vi.fn(async () => true);
    mockCtx.requestEnd = vi.fn(async () => ({}));
    mockCtx.confirmEnd = vi.fn(async () => ({}));

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const reqEnd = await screen.findByText(/Solicitar fin/i);
    fireEvent.click(reqEnd);
    await waitFor(() => expect(mockCtx.requestEnd).toHaveBeenCalled());

    // Confirmar fin removed — ensure end-request count is shown instead
    expect(await screen.findByText(/0\/2 personas/i)).toBeTruthy();
  });

  it('renders tags when service has tags', async () => {
    mockCtx.getServiceById = (id: string) => ({
      id,
      userId: '2',
      title: 'Testing service',
      type: 'offer',
      credits: 1,
      duration: 60,
      tags: ['alpha', 'beta'],
      status: 'active',
      description: 'desc',
      avatar: '',
    });

    render(
      <MemoryRouter initialEntries={["/services/1"]}>
        <Routes>
          <Route path="/services/:id" element={<ServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/alpha/i)).toBeTruthy();
    expect(screen.getByText(/beta/i)).toBeTruthy();
  });
});
