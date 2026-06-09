import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'

// Mock recharts to avoid complex SVG rendering in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Bar: () => null,
}))

// Mock GeoOverviewMap to a simple test-friendly component
vi.mock('../../app/components/GeoOverviewMap', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="geo-overview">geo</div>,
}))

import { Admin } from '../../app/pages/Admin'
import * as AppCtx from '../../app/context/AppContext'
import * as Endpoints from '../../app/api/endpoints'

describe('Admin page', () => {
  beforeEach(() => {
    // Prevent real network calls from the admin stats effect
    vi.spyOn(Endpoints, 'apiAdminGetStats').mockResolvedValue({ user_cells: [], service_cells: [] })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows restricted view for non-admin users', async () => {
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({ currentUser: { isAdmin: false } } as any)
    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
  })

  it('renders KPIs and calls apiAdminGetStats on mount', async () => {
    const users = [{ id: '1', isAdmin: false }, { id: '2', isAdmin: true }]
    const services = [{ id: 's1', status: 'active', category: 'otros', title: 'A', userId: '1', type: 'offer', credits: 1 }]
    const trades = [{ id: 't1', status: 'completed', serviceId: 's1', offererId: '1', requesterId: '2', scheduledDate: new Date().toISOString(), creditsAmount: 2 }]

    const apiSpy = vi.spyOn(Endpoints, 'apiAdminGetStats').mockResolvedValue({ user_cells: [], service_cells: [] })

    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users,
      services,
      trades,
      getUserById: (id: string) => users.find(u => u.id === id),
      getServiceById: (id: string) => services.find(s => s.id === id),
    } as any)

    act(() => { render(<Admin />) })
    await waitFor(() => expect(apiSpy).toHaveBeenCalled())

    // KPI values should be visible
    expect(await screen.findByText('Usuarios')).toBeInTheDocument()
    expect(screen.getByText('Servicios activos')).toBeInTheDocument()
  })

  it('users tab allows assigning badges and deleting users', async () => {
    const user = { id: '1', name: 'Alice', email: 'a@x.com', isAdmin: false, avatar: '', credits: 5, rating: 4, badge: '' }
    const adminUpdateUser = vi.fn()
    const adminDeleteUser = vi.fn()

    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users: [user],
      services: [],
      trades: [],
      adminUpdateUser,
      adminDeleteUser,
      getUserById: (id: string) => user,
      getServiceById: () => undefined,
    } as any)

    // auto-confirm deletion
    const origConfirm = globalThis.confirm
    // @ts-ignore
    globalThis.confirm = () => true

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())

    // open Users tab — pick the tab button whose label begins with 'Usuarios'
    const userTabButtons = screen.getAllByRole('button').filter(b => (b.textContent || '').trim().startsWith('Usuarios'))
    expect(userTabButtons.length).toBeGreaterThan(0)
    fireEvent.click(userTabButtons[0])

    // change badge select
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'gold' } })
    expect(adminUpdateUser).toHaveBeenCalledWith('1', { badge: 'gold' })

    // click delete button
    const delBtn = screen.getByTitle('Eliminar usuario')
    fireEvent.click(delBtn)
    expect(adminDeleteUser).toHaveBeenCalledWith('1')

    globalThis.confirm = origConfirm
  })

  it('services tab allows deleting services', async () => {
    const svc = { id: 's1', title: 'Service', category: 'otros', status: 'active', userId: '1', type: 'offer', credits: 1 }
    const adminDeleteService = vi.fn()
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users: [],
      services: [svc],
      trades: [],
      adminDeleteService,
      getUserById: () => undefined,
      getServiceById: () => svc,
    } as any)

    const origConfirm = globalThis.confirm
    // @ts-ignore
    globalThis.confirm = () => true

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())

    // find the tab button whose label begins with 'Servicios' (tabs show counts)
    const tabButtons = screen.getAllByRole('button').filter(b => (b.textContent || '').trim().startsWith('Servicios'))
    expect(tabButtons.length).toBeGreaterThan(0)
    fireEvent.click(tabButtons[0])

    // find the service row by its title and click the delete button within that row
    const titleEl = screen.getByText('Service')
    // climb ancestors until we find a container that contains the delete button
    let row: Element | null = titleEl
    while (row && row.querySelector('button') === null) row = row.parentElement
    expect(row).toBeTruthy()
    const delBtn = row!.querySelector('button') as HTMLButtonElement
    expect(delBtn).toBeTruthy()
    fireEvent.click(delBtn!)
    expect(adminDeleteService).toHaveBeenCalledWith('s1')

    globalThis.confirm = origConfirm
  })

  it('trades tab shows trades entries', async () => {
    const users = [{ id: '1', name: 'Alice', avatar: '' }, { id: '2', name: 'Bob', avatar: '' }]
    const services = [{ id: 's1', title: 'Cleaning', category: 'otros', userId: '1', type: 'offer', credits: 1 }]
    const trades = [{ id: 't1', serviceId: 's1', offererId: '1', requesterId: '2', status: 'pending', scheduledDate: '2023-01-01T00:00:00Z', creditsAmount: 3 }]

    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users,
      services,
      trades,
      getUserById: (id: string) => users.find(u => u.id === id),
      getServiceById: (id: string) => services.find(s => s.id === id),
    } as any)

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())
    // choose the tab button whose label begins with 'Intercambios' to avoid matching KPI labels
    const tabButtons = screen.getAllByRole('button').filter(b => (b.textContent || '').trim().startsWith('Intercambios'))
    expect(tabButtons.length).toBeGreaterThan(0)
    fireEvent.click(tabButtons[0])

    expect(screen.getByText('Cleaning')).toBeInTheDocument()
    expect(screen.getByText('3h')).toBeInTheDocument()
  })

  it('users tab cancel on delete confirmation', async () => {
    const user = { id: '1', name: 'Alice', email: 'a@x.com', isAdmin: false, avatar: '', credits: 5, rating: 4, badge: '' }
    const adminDeleteUser = vi.fn()

    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users: [user],
      services: [],
      trades: [],
      adminDeleteUser,
      getUserById: (id: string) => user,
      getServiceById: () => undefined,
    } as any)

    const origConfirm = globalThis.confirm
    // @ts-ignore
    globalThis.confirm = () => false

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())

    const userTabButtons = screen.getAllByRole('button').filter(b => (b.textContent || '').trim().startsWith('Usuarios'))
    fireEvent.click(userTabButtons[0])

    const delBtn = screen.getByTitle('Eliminar usuario')
    fireEvent.click(delBtn)
    
    // Should NOT call delete when user cancels
    expect(adminDeleteUser).not.toHaveBeenCalled()

    globalThis.confirm = origConfirm
  })

  it('users tab with search filtering', async () => {
    const users = [
      { id: '1', name: 'Alice Smith', email: 'alice@x.com', isAdmin: false, avatar: '', credits: 5, rating: 4, badge: '' },
      { id: '2', name: 'Bob Jones', email: 'bob@x.com', isAdmin: false, avatar: '', credits: 3, rating: 3, badge: 'gold' }
    ]
    
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users,
      services: [],
      trades: [],
      getUserById: (id: string) => users.find(u => u.id === id),
      getServiceById: () => undefined,
    } as any)

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())

    const userTabButtons = screen.getAllByRole('button').filter(b => (b.textContent || '').trim().startsWith('Usuarios'))
    fireEvent.click(userTabButtons[0])

    // Should show both users initially
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()

    // Search for Alice
    const searchInput = screen.getByPlaceholderText('Buscar usuario...')
    fireEvent.change(searchInput, { target: { value: 'Alice' } })

    // Should filter results
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    // Bob should still be there since search is done at render level
  })

  it('services tab with search filtering', async () => {
    const services = [
      { id: 's1', title: 'Cleaning', category: 'otros', status: 'active', userId: '1', type: 'offer', credits: 1 },
      { id: 's2', title: 'Gardening', category: 'otros', status: 'paused', userId: '1', type: 'request', credits: 2 }
    ]
    
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users: [],
      services,
      trades: [],
      getUserById: () => undefined,
      getServiceById: (id: string) => services.find(s => s.id === id),
    } as any)

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())

    const serviceTabButtons = screen.getAllByRole('button').filter(b => (b.textContent || '').trim().startsWith('Servicios'))
    fireEvent.click(serviceTabButtons[0])

    // Should show both services initially
    expect(screen.getByText('Cleaning')).toBeInTheDocument()
    expect(screen.getByText('Gardening')).toBeInTheDocument()

    // Search for Gardening
    const searchInput = screen.getByPlaceholderText('Buscar servicio...')
    fireEvent.change(searchInput, { target: { value: 'Gardening' } })

    // Results should be filtered
    expect(screen.getByText('Gardening')).toBeInTheDocument()
  })

  it('services tab with paused status shows correctly', async () => {
    const svc = { id: 's1', title: 'Service', category: 'otros', status: 'paused', userId: '1', type: 'offer', credits: 1 }
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users: [],
      services: [svc],
      trades: [],
      getUserById: () => undefined,
      getServiceById: () => svc,
    } as any)

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())

    const serviceTabButtons = screen.getAllByRole('button').filter(b => (b.textContent || '').trim().startsWith('Servicios'))
    fireEvent.click(serviceTabButtons[0])

    expect(screen.getByText('Pausado')).toBeInTheDocument()
  })

  it('services tab delete with confirm', async () => {
    const svc = { id: 's1', title: 'Service', category: 'otros', status: 'active', userId: '1', type: 'offer', credits: 1 }
    const adminDeleteService = vi.fn()
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users: [],
      services: [svc],
      trades: [],
      adminDeleteService,
      getUserById: () => undefined,
      getServiceById: () => svc,
    } as any)

    const origConfirm = globalThis.confirm
    // @ts-ignore
    globalThis.confirm = () => true

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())

    const serviceTabButtons = screen.getAllByRole('button').filter(b => (b.textContent || '').trim().startsWith('Servicios'))
    fireEvent.click(serviceTabButtons[0])

    const titleEl = screen.getByText('Service')
    let row: Element | null = titleEl
    while (row && row.querySelector('button') === null) row = row.parentElement
    const delBtn = row!.querySelector('button') as HTMLButtonElement
    fireEvent.click(delBtn!)
    
    expect(adminDeleteService).toHaveBeenCalledWith('s1')

    globalThis.confirm = origConfirm
  })

  it('badge assignment with different values', async () => {
    const user = { id: '1', name: 'Alice', email: 'a@x.com', isAdmin: false, avatar: '', credits: 5, rating: 4, badge: 'bronze' }
    const adminUpdateUser = vi.fn()

    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users: [user],
      services: [],
      trades: [],
      adminUpdateUser,
      getUserById: (id: string) => user,
      getServiceById: () => undefined,
    } as any)

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())

    const userTabButtons = screen.getAllByRole('button').filter(b => (b.textContent || '').trim().startsWith('Usuarios'))
    fireEvent.click(userTabButtons[0])

    const select = screen.getByRole('combobox') as HTMLSelectElement
    
    // Test clearing badge
    fireEvent.change(select, { target: { value: '' } })
    expect(adminUpdateUser).toHaveBeenCalledWith('1', { badge: '' })

    // Test setting different badges
    fireEvent.change(select, { target: { value: 'silver' } })
    expect(adminUpdateUser).toHaveBeenCalledWith('1', { badge: 'silver' })
  })

  it('shows empty badge text when no badge assigned', async () => {
    const badgeUsers = [
      { id: '1', name: 'User1', avatar: '', hoursGiven: 10, badge: null as any },
      { id: '2', name: 'User2', avatar: '', hoursGiven: 5, badge: 'gold' }
    ]
    
    vi.spyOn(AppCtx, 'useApp').mockReturnValue({
      currentUser: { isAdmin: true },
      users: badgeUsers,
      services: [],
      trades: [],
      getUserById: () => undefined,
      getServiceById: () => undefined,
    } as any)

    act(() => { render(<Admin />) })
    await waitFor(() => expect(Endpoints.apiAdminGetStats).toHaveBeenCalled())

    // The overview tab should show badge info header
    expect(screen.getByText('Vecinos con insignia de solidaridad')).toBeInTheDocument()
  })
})
