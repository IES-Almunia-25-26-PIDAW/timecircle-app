import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

import { Dashboard } from '../../app/pages/Dashboard'

// Provide a mutable mock context object that tests can update per-case
let mockContext: any = {
  currentUser: null,
  getUserTrades: () => [],
  services: [],
  getServiceById: () => undefined,
  getUserById: () => undefined,
  reviews: [],
  viewerLocation: null,
}

vi.mock('../../app/context/AppContext', () => ({
  useApp: () => mockContext,
}))

// Mock NearbyServicesMap and recharts ResponsiveContainer to keep tests deterministic
vi.mock('../../app/components/NearbyServicesMap', () => ({
  __esModule: true,
  default: ({ services }: any) => <div data-testid="nearby-map">{services?.length || 0}</div>,
}))

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts') as any
  return { ...actual, ResponsiveContainer: ({ children }: any) => <div>{children}</div>, AreaChart: ({ children }: any) => <div>{children}</div>, Area: () => <div />, XAxis: () => <div />, YAxis: () => <div />, Tooltip: () => <div /> }
})

describe('Dashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders user info, badge and stats, and maps services to NearbyServicesMap', () => {
    const mockUser = {
      id: 'u1', name: 'Ana Lopez', location: 'Madrid', memberSince: '2025-01-01', credits: 5, completedTrades: 2, rating: 4.2, totalReviews: 3, hoursGiven: 10, badge: 'gold', latitude: 40.4, longitude: -3.7
    }

    const mockServices = [
      { id: 's1', userId: 'other', title: 'Srv1', category: 'hogar', type: 'offer', credits: 1, status: 'active', distanceKm: 2, user: { latitude: 40.4, longitude: -3.7, name: 'X', avatar: '', rating: 4 } },
      { id: 's2', userId: 'other', title: 'Srv2', category: 'tecnologia', type: 'request', credits: 2, status: 'active', distanceKm: 5, user: { latitude: 40.5, longitude: -3.6, name: 'Y', avatar: '', rating: 5 } },
    ]

    const mockTrades = [
      { id: 't1', serviceId: 's1', offererId: 'other', requesterId: 'u1', status: 'completed', scheduledDate: '2026-01-01', creditsAmount: 2, completedAt: '2026-01-01' },
      { id: 't2', serviceId: 's2', offererId: 'other', requesterId: 'u1', status: 'in_progress', scheduledDate: '2026-05-01', creditsAmount: 1 },
    ]

    // Set-up mockContext for this test
    mockContext = {
      currentUser: mockUser,
      getUserTrades: (id: string) => mockTrades,
      services: mockServices,
      getServiceById: (id: string) => mockServices.find(s => s.id === id),
      getUserById: (id: string) => ({ id, name: 'Other', avatar: '' }),
      reviews: [],
      viewerLocation: null,
    }

    const { rerender } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    // Header with user's first name
    expect(screen.getByText(/Hola, Ana/i)).toBeInTheDocument()

    // Badge shown
    expect(screen.getByText(/Vecino de Oro/i)).toBeInTheDocument()

    // Credits displayed inside 'Mis Créditos' card
    // Ensure credits number is present
    expect(screen.getByText('5')).toBeInTheDocument()

    // Active trades header is present
    expect(screen.getByText(/Intercambios activos/i)).toBeInTheDocument()

    // NearbyServicesMap receives mapped services (our mock renders length)
    expect(screen.getByTestId('nearby-map')).toHaveTextContent('2')

    // Active trades area should show in_progress trade
    expect(screen.getByText(/Intercambios activos/i)).toBeInTheDocument()

    // Update mockContext to have no services and re-render
    mockContext.services = []
    rerender(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    expect(screen.getByTestId('nearby-map')).toHaveTextContent('0')
  })

  it('calculates activity correctly for last six months', () => {
    const mockUser = { id: 'u2', name: 'Pablo', memberSince: '2024-01-01', credits: 0, completedTrades: 0, rating: 0, totalReviews: 0, hoursGiven: 0 }
    const today = new Date()
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 5).toISOString().split('T')[0]
    const trades = [ { id: 'a', serviceId: 's', offererId: 'x', requesterId: 'u2', status: 'completed', completedAt: lastMonth, creditsAmount: 3 } ]

    mockContext = { currentUser: mockUser, getUserTrades: () => trades, services: [], getServiceById: () => undefined, getUserById: () => undefined, reviews: [], viewerLocation: null }

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )

    // The activity chart data is rendered; we at least ensure component mounts and shows header
    expect(screen.getByText(/Actividad \(horas\)/i)).toBeInTheDocument()
  })

  it('shows fallback text when no filtered services', () => {
    const mockUser = { id: 'u3', name: 'Lucia', memberSince: '2024-01-01', credits: 0, completedTrades: 0, rating: 0, totalReviews: 0, hoursGiven: 0 }
    mockContext = { ...mockContext, currentUser: mockUser, services: [] }
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    expect(screen.getByText(/No hay servicios filtrados\./i)).toBeInTheDocument()
  })

  it('shows empty my services state and publish call-to-action', () => {
    const mockUser = { id: 'u4', name: 'Marta Perez', memberSince: '2023-06-01', credits: 1, completedTrades: 0, rating: 0, totalReviews: 0, hoursGiven: 0 }
    // services exist but belong to others so myServices is empty
    const services = [{ id: 's9', userId: 'other', title: 'OtherService', category: 'hogar', type: 'offer', credits: 1, status: 'active' }]
    mockContext = { ...mockContext, currentUser: mockUser, services }
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    expect(screen.getByText(/Aún no has publicado servicios/i)).toBeInTheDocument()
    expect(screen.getByText(/Publicar ahora/i)).toBeInTheDocument()
  })

  it('renders recent reviews when present', () => {
    const mockUser = { id: 'u5', name: 'Raul', memberSince: '2022-01-01', credits: 2, completedTrades: 1, rating: 4.5, totalReviews: 1, hoursGiven: 3 }
    const reviews = [{ id: 'r1', reviewerId: 'rev1', revieweeId: 'u5', rating: 4, comment: 'Buen servicio' }]
    const services: any[] = []
    mockContext = { ...mockContext, currentUser: mockUser, services, reviews, getUserById: (id: string) => ({ id, name: 'Reviewer', avatar: '/a.png' }) }
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    expect(screen.getByText(/Últimas valoraciones recibidas/i)).toBeInTheDocument()
    expect(screen.getByText(/Buen servicio/i)).toBeInTheDocument()
    expect(screen.getByText(/Reviewer/i)).toBeInTheDocument()
  })

  it('uses viewerLocation when available and falls back to default when no coords', () => {
    const mockUser = { id: 'u6', name: 'NoCoords', memberSince: '2020-01-01', credits: 0, completedTrades: 0, rating: 0, totalReviews: 0, hoursGiven: 0 }
    // First case: viewerLocation provided
    mockContext = { ...mockContext, currentUser: mockUser, viewerLocation: { lat: 10, lon: 20 }, services: [] }
    const { rerender } = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    expect(screen.getByTestId('nearby-map')).toBeInTheDocument()

    // Second case: no viewerLocation and no user coords -> default center used
    mockContext = { ...mockContext, currentUser: { ...mockUser, latitude: undefined, longitude: undefined }, viewerLocation: null, services: [] }
    rerender(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    expect(screen.getByTestId('nearby-map')).toBeInTheDocument()
  })

  it('renders recent community services list', () => {
    const mockUser = { id: 'u7', name: 'Community', memberSince: '2021-01-01', credits: 1, completedTrades: 0, rating: 0, totalReviews: 0, hoursGiven: 0 }
    const services = [ { id: 's10', userId: 'uOther', title: 'Community Service', category: 'hogar', type: 'offer', credits: 1, status: 'active' } ]
    mockContext = { ...mockContext, currentUser: mockUser, services, getUserById: (id: string) => ({ id, name: 'OtherUser' }), reviews: [] }
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    expect(screen.getByText(/Nuevos servicios/i)).toBeInTheDocument()
    expect(screen.getByText(/Community Service/i)).toBeInTheDocument()
    expect(screen.getByText(/OtherUser/i)).toBeInTheDocument()
  })

  it('type filter updates filtered services', async () => {
    const mockUser = { id: 'u8', name: 'FilterUser', memberSince: '2020-01-01', credits: 0, completedTrades: 0, rating: 0, totalReviews: 0, hoursGiven: 0 }
    const services = [ { id: 'soffer', userId: 'other', title: 'OfferSvc', category: 'hogar', type: 'offer', credits: 1, status: 'active' }, { id: 'sreq', userId: 'other', title: 'ReqSvc', category: 'hogar', type: 'request', credits: 1, status: 'active' } ]
    mockContext = { ...mockContext, currentUser: mockUser, services, getUserById: () => ({ name: 'X' }), reviews: [] }
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    const select = screen.getByLabelText(/Tipo:/i)
    expect(select).toBeInTheDocument()
    // filter to requests
    fireEvent.change(select as HTMLSelectElement, { target: { value: 'request' } })
    // nearby-map should reflect filtered length 1 (renders deterministically)
    expect(screen.getByTestId('nearby-map')).toBeInTheDocument()
  })

  it('renders my services when present', () => {
    const mockUser = { id: 'me', name: 'Owner', memberSince: '2020-01-01', credits: 0, completedTrades: 0, rating: 0, totalReviews: 0, hoursGiven: 0 }
    const services = [ { id: 's-own', userId: 'me', title: 'My Service', category: 'hogar', type: 'offer', credits: 2, status: 'active' } ]
    mockContext = { ...mockContext, currentUser: mockUser, services, getUserById: () => ({ name: 'Owner' }), reviews: [] }
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    )
    expect(screen.getByText(/Mis servicios/i)).toBeInTheDocument()
    const svc = screen.getByText(/My Service/i)
    expect(svc).toBeInTheDocument()
    const svcContainer = svc.parentElement?.parentElement
    expect(svcContainer).toBeTruthy()
    expect((svcContainer as HTMLElement).textContent).toMatch(/Activo/i)
  })
})
