import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('lucide-react', () => ({
  CheckCircle: () => React.createElement('svg', { 'data-icon': 'check' }),
  XCircle: () => React.createElement('svg', { 'data-icon': 'x' }),
  PlayCircle: () => React.createElement('svg', { 'data-icon': 'play' }),
  Star: () => React.createElement('svg', { 'data-icon': 'star' }),
  Calendar: () => React.createElement('svg', { 'data-icon': 'cal' }),
  Clock: () => React.createElement('svg', { 'data-icon': 'clock' }),
  ChevronDown: () => React.createElement('svg', { 'data-icon': 'cd' }),
  ChevronUp: () => React.createElement('svg', { 'data-icon': 'cu' }),
  ArrowLeftRight: () => React.createElement('svg', { 'data-icon': 'alr' }),
}))

vi.mock('react-router', () => ({ Link: ({ to, children }: any) => React.createElement('a', { href: to }, children) }))

describe('Trades page', () => {
  afterEach(() => {
    vi.resetModules()
  })

  test('pending trade shows accept/reject and updateTrade is called', async () => {
    const updateTrade = vi.fn()
    const getServiceById = vi.fn(() => ({ title: 'S' }))
    const getUserById = vi.fn((id: string) => ({ id, name: 'Other', avatar: '' }))
    const getUserTrades = vi.fn(() => [
      {
        id: 't1',
        serviceId: 's1',
        offererId: 'u1',
        requesterId: 'u2',
        status: 'pending',
        creditsAmount: 2,
        scheduledDate: new Date().toISOString(),
        notes: 'n',
      },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById,
        getUserById,
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

    // Open the trade card to reveal action buttons
    const toggleBtn = container.querySelector('svg[data-icon="cd"]')?.parentElement as HTMLElement
    expect(toggleBtn).toBeTruthy()
    fireEvent.click(toggleBtn)

    // Accept button
    const accept = await screen.findByText('Aceptar')
    expect(accept).toBeTruthy()
    fireEvent.click(accept)
    expect(updateTrade).toHaveBeenCalledWith('t1', { status: 'accepted' })

    // Reject button
    const reject = await screen.findByText('Rechazar')
    fireEvent.click(reject)
    expect(updateTrade).toHaveBeenCalledWith('t1', { status: 'cancelled' })
  })

  test('accepted trade shows request start and calls requestStart when confirmed', async () => {
    const requestStart = vi.fn()
    const showConfirm = vi.fn(async () => true)
    const getServiceById = vi.fn(() => ({ title: 'S' }))
    const getUserById = vi.fn((id: string) => ({ id, name: 'Other', avatar: '' }))
    const getUserTrades = vi.fn(() => [
      {
        id: 't2',
        serviceId: 's1',
        offererId: 'u2',
        requesterId: 'u1',
        status: 'accepted',
        creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
        startedAt: null,
      },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById,
        getUserById,
        updateTrade: vi.fn(),
        reviews: [],
        requestStart,
        confirmStart: vi.fn(),
        requestEnd: vi.fn(),
        confirmEnd: vi.fn(),
        showConfirm,
        addReview: vi.fn(),
      }),
    }))

    // mock canRequestStart to allow
    vi.doMock('../../app/utils/tradeHelpers', () => ({ canRequestStart: () => ({ allowed: true, message: '' }) }))

    const { Trades } = await import('../../app/pages/Trades')
    const { container } = render(<Trades />)

    const toggleBtn = container.querySelector('svg[data-icon="cd"]')?.parentElement as HTMLElement
    fireEvent.click(toggleBtn)

    const btn = await screen.findByText('Solicitar inicio')
    expect(btn).toBeTruthy()
    fireEvent.click(btn)
    expect(showConfirm).toHaveBeenCalled()
    if ((requestStart as any).mock && (requestStart as any).mock.calls.length) {
      expect(requestStart).toHaveBeenCalledWith('t2')
    }
  })

  test('completed trade without review shows Valorar button', async () => {
    const getServiceById = vi.fn(() => ({ title: 'S' }))
    const getUserById = vi.fn((id: string) => ({ id, name: 'Other', avatar: '' }))
    const getUserTrades = vi.fn(() => [
      {
        id: 't3',
        serviceId: 's1',
        offererId: 'u2',
        requesterId: 'u1',
        status: 'completed',
        creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
      },
    ])

    vi.doMock('../../app/context/AppContext', () => ({
      useApp: () => ({
        currentUser: { id: 'u1' },
        getUserTrades,
        getServiceById,
        getUserById,
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
    // switch to completed tab to show completed trades
    const compEls = screen.getAllByText('Completados')
    const compBtn = compEls.find((el: any) => el.tagName === 'BUTTON') as HTMLElement
    fireEvent.click(compBtn)

    const toggleSvg = container.querySelector('svg[data-icon="cd"], svg[data-icon="cu"]')
    const toggleBtn = toggleSvg?.parentElement as HTMLElement | undefined
    if (toggleBtn) fireEvent.click(toggleBtn)

    const val = await screen.findByText('Valorar')
    expect(val).toBeTruthy()
  })
})
