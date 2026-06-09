import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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
}))

vi.mock('react-router', () => ({ Link: ({ to, children }: any) => React.createElement('a', { href: to }, children) }))

describe('Trades additional branches', () => {
  afterEach(() => vi.resetModules())

  test('canRequestStart false disables Solicitar inicio', async () => {
    const getServiceById = vi.fn(() => ({ title: 'S' }))
    const getUserById = vi.fn((id: string) => ({ id, name: 'Other', avatar: '' }))
    const getUserTrades = vi.fn(() => [
      {
        id: 't8',
        serviceId: 's1',
        offererId: 'u2',
        requesterId: 'u1',
        status: 'accepted',
        creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
      },
    ])

    vi.doMock('../../app/utils/tradeHelpers', () => ({ canRequestStart: () => ({ allowed: false, message: 'No puedes' }) }))

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
    const toggle = container.querySelector('svg[data-icon="chev-down"], svg[data-icon="chev-up"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    const btn = await screen.findByText('Solicitar inicio')
    expect(btn).toBeTruthy()
    expect(btn).toHaveAttribute('disabled')
    expect(btn).toHaveAttribute('title', 'No puedes')
  })

  test('pending requester can cancel', async () => {
    const updateTrade = vi.fn()
    const getServiceById = vi.fn(() => ({ title: 'S' }))
    const getUserById = vi.fn((id: string) => ({ id, name: 'Other', avatar: '' }))
    const getUserTrades = vi.fn(() => [
      {
        id: 't9',
        serviceId: 's1',
        offererId: 'u2',
        requesterId: 'u1',
        status: 'pending',
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
    const toggle = container.querySelector('svg[data-icon="chev-down"], svg[data-icon="chev-up"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    const cancel = await screen.findByText('Cancelar solicitud')
    fireEvent.click(cancel)
    expect(updateTrade).toHaveBeenCalledWith('t9', { status: 'cancelled' })
  })

  test('renders trade notes when present', async () => {
    const getServiceById = vi.fn(() => ({ title: 'S' }))
    const getUserById = vi.fn((id: string) => ({ id, name: 'Other', avatar: '' }))
    const getUserTrades = vi.fn(() => [
      {
        id: 't10',
        serviceId: 's1',
        offererId: 'u2',
        requesterId: 'u1',
        status: 'pending',
        creditsAmount: 1,
        scheduledDate: new Date().toISOString(),
        notes: 'these are notes',
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
    const toggle = container.querySelector('svg[data-icon="chev-down"], svg[data-icon="chev-up"]')?.parentElement as HTMLElement
    if (toggle) fireEvent.click(toggle)

    expect(screen.getByText(/📝 these are notes/)).toBeTruthy()
  })
})
