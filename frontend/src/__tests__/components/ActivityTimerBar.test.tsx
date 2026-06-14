import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockUseApp = vi.fn()
vi.mock('../../app/context/AppContext', () => ({
  useApp: () => mockUseApp(),
}))

import ActivityTimerBar from '../../app/components/ActivityTimerBar'

describe('ActivityTimerBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(0))
    mockUseApp.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render when there is no active trade for current user', () => {
    mockUseApp.mockReturnValueOnce({
      currentUser: { id: 1 },
      trades: [
        { id: 10, offererId: 2, requesterId: 3, status: 'accepted', scheduledDate: null, startedAt: null },
      ],
      refreshTrades: vi.fn(),
      requestEnd: vi.fn(),
      confirmEnd: vi.fn(),
      requestStart: vi.fn(),
      confirmStart: vi.fn(),
    })

    const { container } = render(<ActivityTimerBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders accepted trade with start actions and refreshes on event', () => {
    const requestStart = vi.fn().mockResolvedValue(undefined)
    const confirmStart = vi.fn().mockResolvedValue(undefined)
    const refreshTrades = vi.fn().mockResolvedValue(undefined)

    mockUseApp.mockReturnValueOnce({
      currentUser: { id: 2 },
      trades: [
        {
          id: 8,
          offererId: 1,
          requesterId: 2,
          serviceId: 7,
          status: 'accepted',
          scheduledDate: '1970-01-01T01:00:00.000Z',
          startedAt: '1970-01-01T00:00:01.000Z',
          creditsAmount: 1,
          notes: '',
        },
      ],
      refreshTrades,
      requestEnd: vi.fn(),
      confirmEnd: vi.fn(),
      requestStart,
      confirmStart,
    })

    render(<ActivityTimerBar />)

    expect(screen.getByText(/Inicio solicitado/i)).toBeInTheDocument()
    expect(screen.getByText('Intercambio 8')).toBeInTheDocument()
    expect(screen.getByText('02:00:00')).toBeInTheDocument()
    expect(screen.getByText('Desde inicio')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Confirmar inicio/i }))

    const event = new CustomEvent('tc:trade:event')
    globalThis.dispatchEvent(event)
    expect(refreshTrades).toHaveBeenCalled()
  })

  it('shows mm:ss format when remaining is less than an hour', () => {
    // scheduled 1.5 hours before epoch, creditsAmount 2 -> remaining = 0.5h = 30:00
    mockUseApp.mockReturnValueOnce({
      currentUser: { id: 1 },
      trades: [
        {
          id: 20,
          offererId: 1,
          requesterId: 2,
          serviceId: 3,
          status: 'in_progress',
          scheduledDate: new Date(-5400000).toISOString(),
          startedAt: new Date(-5400000 + 1000).toISOString(),
          creditsAmount: 2,
          notes: 'Short remaining',
        },
      ],
      refreshTrades: vi.fn(),
      requestEnd: vi.fn(),
      confirmEnd: vi.fn(),
      requestStart: vi.fn(),
      confirmStart: vi.fn(),
    })

    render(<ActivityTimerBar />)

    expect(screen.getByText(/En curso/i)).toBeInTheDocument()
    expect(screen.getByText('Short remaining')).toBeInTheDocument()
    // expect mm:ss format (no hours) — 30 minutes remaining
    expect(screen.getByText('30:00')).toBeInTheDocument()
  })
})
