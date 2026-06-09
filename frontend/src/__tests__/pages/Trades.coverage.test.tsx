import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('lucide-react', () => ({
  PlayCircle: () => React.createElement('svg', { 'data-icon': 'play' }),
  XCircle: () => React.createElement('svg', { 'data-icon': 'x' }),
  Clock: () => React.createElement('svg', { 'data-icon': 'clock' }),
  Calendar: () => React.createElement('svg', { 'data-icon': 'cal' }),
  Star: () => React.createElement('svg', { 'data-icon': 'star' }),
  ArrowLeftRight: () => React.createElement('svg', { 'data-icon': 'alr' }),
  ChevronDown: () => React.createElement('svg', { 'data-icon': 'chev-down' }),
  ChevronUp: () => React.createElement('svg', { 'data-icon': 'chev-up' }),
  CheckCircle: () => React.createElement('svg', { 'data-icon': 'check' }),
}))

vi.mock('react-router', () => ({ Link: ({ to, children }: any) => React.createElement('a', { href: to }, children) }))

describe('Trades.tsx targeted coverage', () => {
  afterEach(() => vi.resetModules())

  test('pending offerer sees Aceptar and Rechazar and can accept', async () => {
    const updateTrade = vi.fn()
    const getUserTrades = vi.fn(() => [
      {
        id: 't1', serviceId: 's1', offererId: 'u1', requesterId: 'u2', status: 'pending', creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
      },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById: () => ({ title: 'S' }),
        getUserById: (id: string) => ({ id, name: id === 'u2' ? 'Other' : 'Me', avatar: '' }),
        updateTrade,
        reviews: [],
        requestStart: vi.fn(),
        confirmStart: vi.fn(),
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview: vi.fn(),
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    const toggle = container.querySelector('svg[data-icon="chev-down"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    const accept = await screen.findByText('Aceptar')
    fireEvent.click(accept)
    expect(updateTrade).toHaveBeenCalledWith('t1', { status: 'accepted' })
  })

  test('pending requester can cancel', async () => {
    const updateTrade = vi.fn()
    const getUserTrades = vi.fn(() => [
      {
        id: 't2', serviceId: 's1', offererId: 'u2', requesterId: 'u1', status: 'pending', creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
      },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById: () => ({ title: 'S' }),
        getUserById: (id: string) => ({ id, name: id === 'u2' ? 'Other' : 'Me', avatar: '' }),
        updateTrade,
        reviews: [],
        requestStart: vi.fn(),
        confirmStart: vi.fn(),
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview: vi.fn(),
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    const toggle = container.querySelector('svg[data-icon="chev-down"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    const cancel = await screen.findByText('Cancelar solicitud')
    fireEvent.click(cancel)
    expect(updateTrade).toHaveBeenCalledWith('t2', { status: 'cancelled' })
  })

  test('accepted can request start when allowed', async () => {
    const requestStart = vi.fn(async () => {})
    const getUserTrades = vi.fn(() => [
      { id: 't3', serviceId: 's1', offererId: 'u2', requesterId: 'u1', status: 'accepted', creditsAmount: 1, scheduledDate: new Date().toISOString() },
    ])

    vi.doMock('../../app/utils/tradeHelpers', () => ({ canRequestStart: () => ({ allowed: true, message: '' }) }))

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById: () => ({ title: 'S' }),
        getUserById: (id: string) => ({ id, name: 'Other', avatar: '' }),
        updateTrade: vi.fn(),
        reviews: [],
        requestStart,
        confirmStart: vi.fn(),
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview: vi.fn(),
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    const toggle = container.querySelector('svg[data-icon="chev-down"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    const req = await screen.findByText('Solicitar inicio')
    expect(req).toBeTruthy()
    expect(req.getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(req)
    await waitFor(() => expect(requestStart).toHaveBeenCalledWith('t3'))
  })

  test('accepted with startedById == currentUser shows Inicio solicitado', async () => {
    const getUserTrades = vi.fn(() => [
      { id: 't4', serviceId: 's1', offererId: 'u2', requesterId: 'u1', status: 'accepted', startedById: 'u1', startedAt: new Date().toISOString(), creditsAmount: 1, scheduledDate: new Date().toISOString() },
    ])

    vi.doMock('../../app/utils/tradeHelpers', () => ({ canRequestStart: () => ({ allowed: true, message: '' }) }))

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById: () => ({ title: 'S' }),
        getUserById: (id: string) => ({ id, name: 'Other', avatar: '' }),
        updateTrade: vi.fn(),
        reviews: [],
        requestStart: vi.fn(),
        confirmStart: vi.fn(),
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview: vi.fn(),
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    const toggle = container.querySelector('svg[data-icon="chev-down"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    expect(await screen.findByText('Inicio solicitado')).toBeTruthy()
  })

  test('other requested shows Confirmar inicio and confirms', async () => {
    const confirmStart = vi.fn(async () => {})
    const getUserTrades = vi.fn(() => [
      { id: 't5', serviceId: 's1', offererId: 'u1', requesterId: 'u2', status: 'accepted', startedById: 'u2', startedAt: new Date().toISOString(), creditsAmount: 1, scheduledDate: new Date().toISOString() },
    ])

    vi.doMock('../../app/utils/tradeHelpers', () => ({ canRequestStart: () => ({ allowed: true, message: '' }) }))

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById: () => ({ title: 'S' }),
        getUserById: (id: string) => ({ id, name: 'Other', avatar: '' }),
        updateTrade: vi.fn(),
        reviews: [],
        requestStart: vi.fn(),
        confirmStart,
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview: vi.fn(),
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    const toggle = container.querySelector('svg[data-icon="chev-down"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    const conf = await screen.findByText('Confirmar inicio')
    expect(conf).toBeTruthy()
    fireEvent.click(conf)
    await waitFor(() => expect(confirmStart).toHaveBeenCalledWith('t5'))
  })

  test('in_progress shows Solicitar fin and Confirmar fin and they call handlers', async () => {
    const requestEnd = vi.fn(async () => {})
    const confirmEnd = vi.fn(async () => {})
    const getUserTrades = vi.fn(() => [
      { id: 't6', serviceId: 's1', offererId: 'u1', requesterId: 'u2', status: 'in_progress', creditsAmount: 1, scheduledDate: new Date().toISOString() },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById: () => ({ title: 'S' }),
        getUserById: (id: string) => ({ id, name: 'Other', avatar: '' }),
        updateTrade: vi.fn(),
        reviews: [],
        requestStart: vi.fn(),
        confirmStart: vi.fn(),
        requestEnd,
        confirmEnd,
        showConfirm: async () => true,
        addReview: vi.fn(),
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    const toggle = container.querySelector('svg[data-icon="chev-down"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    const reqEnd = await screen.findByText('Solicitar fin')
    expect(reqEnd).toBeTruthy()
    fireEvent.click(reqEnd)
    await waitFor(() => expect(requestEnd).toHaveBeenCalledWith('t6'))

    const confEnd = await screen.findByText('Confirmar fin')
    expect(confEnd).toBeTruthy()
    fireEvent.click(confEnd)
    await waitFor(() => expect(confirmEnd).toHaveBeenCalledWith('t6'))
  })

  test('completed shows Valorar and submitting review calls addReview', async () => {
    const addReview = vi.fn()
    const getUserTrades = vi.fn(() => [
      { id: 't7', serviceId: 's1', offererId: 'u2', requesterId: 'u1', status: 'completed', creditsAmount: 1, scheduledDate: new Date().toISOString() },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById: () => ({ title: 'S' }),
        getUserById: (id: string) => ({ id, name: 'Other', avatar: '' }),
        updateTrade: vi.fn(),
        reviews: [],
        requestStart: vi.fn(),
        confirmStart: vi.fn(),
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview,
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    const toggle = container.querySelector('svg[data-icon="chev-down"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    // switch to completed tab to show completed trades
    const completedMatches = screen.getAllByText('Completados')
    const completedTab = completedMatches.find(el => el.tagName === 'BUTTON') as HTMLElement
    fireEvent.click(completedTab)
    // expand the trade to reveal action buttons
    const toggleDown = container.querySelector('svg[data-icon="chev-down"]')?.parentElement as HTMLElement
    if (toggleDown) fireEvent.click(toggleDown)

    const valorar = await screen.findByText('Valorar')
    fireEvent.click(valorar)

    // modal interaction: click a star and type comment then submit
    const star = await screen.findAllByLabelText(/Puntuación 4/)
    if (star && star[0]) fireEvent.click(star[0])
    const textarea = await screen.findByPlaceholderText('Comparte tu experiencia con la comunidad...')
    fireEvent.change(textarea, { target: { value: 'This is long enough' } })
    const send = await screen.findByText('Enviar valoración')
    fireEvent.click(send)
    expect(addReview).toHaveBeenCalled()
    expect(await screen.findByText('¡Valoración enviada!')).toBeTruthy()
  })

  test('review modal does not submit when rating is zero', async () => {
    const addReview = vi.fn()
    const getUserTrades = vi.fn(() => [
      { id: 't8', serviceId: 's1', offererId: 'u2', requesterId: 'u1', status: 'completed', creditsAmount: 1, scheduledDate: new Date().toISOString() },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById: () => ({ title: 'S' }),
        getUserById: (id: string) => ({ id, name: 'Other', avatar: '' }),
        updateTrade: vi.fn(),
        reviews: [],
        requestStart: vi.fn(),
        confirmStart: vi.fn(),
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm: async () => true,
        addReview,
      }),
    }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)

    const completedMatches = screen.getAllByText('Completados')
    const completedTab = completedMatches.find(el => el.tagName === 'BUTTON') as HTMLElement
    fireEvent.click(completedTab)

    // expand the completed trade to reveal action buttons
    const toggleDown = container.querySelector('svg[data-icon="chev-down"]')?.parentElement as HTMLElement
    if (toggleDown) fireEvent.click(toggleDown)

    const valorar = await screen.findByText('Valorar')
    fireEvent.click(valorar)

    const send = await screen.findByText('Enviar valoración')
    fireEvent.click(send)
    expect(addReview).not.toHaveBeenCalled()
  })

  test('Trades returns null when no currentUser', async () => {
    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({ currentUser: null, getUserTrades: () => [] }),
    }))
    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)
    expect(container.innerHTML).toBe('')
  })
})
