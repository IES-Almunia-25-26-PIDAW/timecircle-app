import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import Calendar from '../../app/pages/Calendar'

const navigateMock = vi.fn()

const mockContext: any = {
  currentUser: null,
  getUserTrades: vi.fn(() => []),
  getServiceById: vi.fn(() => null),
  getUserById: vi.fn(() => null),
  startConversation: vi.fn(),
}

vi.mock('../../app/context/AppContext', () => ({
  useApp: () => mockContext,
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

// Mock FullCalendar to expose handlers we can trigger from tests and to
// surface the `events` prop so we can validate mapping logic.
vi.mock('@fullcalendar/react', () => {
  const React = require('react')
  return {
    __esModule: true,
    default: ({ events, eventClick, eventMouseEnter, eventMouseMove, eventMouseLeave }: any) => (
      React.createElement('div', { 'data-testid': 'fullcalendar' },
        React.createElement('pre', { 'data-testid': 'fc-events' }, JSON.stringify(events || [])),
        React.createElement('button', { 'data-testid': 'btn-click-conv', onClick: () => eventClick?.({ event: { extendedProps: { conversationId: 'conv-1' } } }) }, 'click-conv'),
        React.createElement('button', { 'data-testid': 'btn-click-startconv', onClick: () => eventClick?.({ event: { extendedProps: { conversationId: null, otherUserId: 'u-other', serviceId: null } } }) }, 'click-startconv'),
        React.createElement('button', { 'data-testid': 'btn-click-service', onClick: () => eventClick?.({ event: { extendedProps: { conversationId: null, otherUserId: null, serviceId: 's-1' } } }) }, 'click-service'),
        React.createElement('button', { 'data-testid': 'btn-mouse-enter', onClick: () => eventMouseEnter?.({ event: { title: 'T', start: '2026-01-01T10:00:00Z', end: '2026-01-01T11:00:00Z', extendedProps: { status: 'OK' } }, jsEvent: { clientX: 11, clientY: 22 } }) }, 'mouse-enter'),
        React.createElement('button', { 'data-testid': 'btn-mouse-move', onClick: () => eventMouseMove?.({ jsEvent: { clientX: 99, clientY: 100 } }) }, 'mouse-move'),
        React.createElement('button', { 'data-testid': 'btn-mouse-leave', onClick: () => eventMouseLeave?.({}) }, 'mouse-leave'),
      )
    ),
  }
})

describe('Calendar page', () => {
  afterEach(() => {
    vi.clearAllMocks()
    // clean up any tooltip nodes if left behind
    const t = document.querySelector('.fc-event-tooltip')
    if (t) t.remove()
  })

  it('prompts login when there is no current user', () => {
    mockContext.currentUser = null
    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    expect(screen.getByText(/Inicia sesión para ver tu calendario/i)).toBeInTheDocument()
  })

  it('builds events from trades and renders them into FullCalendar events prop', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([
      { id: 'tt', serviceId: 's1', offererId: 'me', requesterId: 'u-other', scheduledDate: '2026-01-01T10:00:00Z', createdAt: new Date().toISOString(), status: 'ok' },
    ])
    mockContext.getServiceById.mockReturnValue({ title: 'Service', duration: 60 })
    mockContext.getUserById.mockReturnValue({ name: 'Other' })

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    expect(events.length).toBe(1)
    expect(events[0].title).toContain('Service')
    expect(events[0].title).toContain('Other')
  })

  it('handles requesterId as otherUserId when trade.offererId === currentUser.id', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([
      { id: 't1', serviceId: 's1', offererId: 'me', requesterId: 'u-req', scheduledDate: '2026-01-01T10:00:00Z', createdAt: new Date().toISOString() },
    ])
    mockContext.getServiceById.mockReturnValue({ title: 'Service', duration: 60 })
    mockContext.getUserById.mockReturnValue({ name: 'Requester' })

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    expect(events[0].title).toContain('Requester')
    expect(mockContext.getUserById).toHaveBeenCalledWith('u-req')
  })

  it('uses offererId as otherUserId when trade.requesterId === currentUser.id', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([
      { id: 't2', serviceId: 's1', offererId: 'u-off', requesterId: 'me', scheduledDate: '2026-01-01T10:00:00Z', createdAt: new Date().toISOString() },
    ])
    mockContext.getServiceById.mockReturnValue({ title: 'Service', duration: 60 })
    mockContext.getUserById.mockReturnValue({ name: 'Offerer' })

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    expect(events[0].title).toContain('Offerer')
    expect(mockContext.getUserById).toHaveBeenCalledWith('u-off')
  })

  it('handles missing service title', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([
      { id: 't3', serviceId: 's-none', offererId: 'me', requesterId: 'u-other', scheduledDate: '2026-01-01T10:00:00Z', createdAt: new Date().toISOString() },
    ])
    mockContext.getServiceById.mockReturnValue(null)
    mockContext.getUserById.mockReturnValue({ name: 'Other' })

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    expect(events[0].title).toContain('Other')
  })

  it('handles missing user name', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([
      { id: 't4', serviceId: 's1', offererId: 'me', requesterId: 'u-unknown', scheduledDate: '2026-01-01T10:00:00Z', createdAt: new Date().toISOString() },
    ])
    mockContext.getServiceById.mockReturnValue({ title: 'Service', duration: 60 })
    mockContext.getUserById.mockReturnValue(null)

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    expect(events[0].title).toContain('Service')
  })

  it('handles missing scheduledDate using createdAt', () => {
    const createdAtTime = new Date('2025-12-20T09:00:00Z')
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([
      { id: 't5', serviceId: 's1', offererId: 'me', requesterId: 'u-other', scheduledDate: null, createdAt: createdAtTime.toISOString() },
    ])
    mockContext.getServiceById.mockReturnValue({ title: 'Service', duration: 60 })
    mockContext.getUserById.mockReturnValue({ name: 'Other' })

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    expect(new Date(events[0].start).toISOString()).toBe(createdAtTime.toISOString())
  })

  it('uses default duration when service has no duration', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([
      { id: 't6', serviceId: 's1', offererId: 'me', requesterId: 'u-other', scheduledDate: '2026-01-01T10:00:00Z', createdAt: new Date().toISOString() },
    ])
    mockContext.getServiceById.mockReturnValue({ title: 'Service' })
    mockContext.getUserById.mockReturnValue({ name: 'Other' })

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    expect(events[0].start).toBe(events[0].end)
  })

  it('handles trade with all fields missing (fallback to Cita)', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([
      { id: 't7', serviceId: 'unknown', offererId: 'me', requesterId: 'unknown-user', scheduledDate: null, createdAt: '2026-01-01T00:00:00Z' },
    ])
    mockContext.getServiceById.mockReturnValue(null)
    mockContext.getUserById.mockReturnValue(null)

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    expect(events[0].title).toBe('Cita')
  })

  it('handles trade with missing both offererId and requesterId (otherUserId || fallback)', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([
      { id: 't8', serviceId: 's1', offererId: undefined, requesterId: null, scheduledDate: '2026-01-01T10:00:00Z', createdAt: new Date().toISOString() },
    ])
    mockContext.getServiceById.mockReturnValue({ title: 'Service', duration: 60 })
    mockContext.getUserById.mockReturnValue(null)

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    // when both offererId and requesterId are falsy, getUserById should be called with empty string
    expect(mockContext.getUserById).toHaveBeenCalledWith('')
    expect(events[0].title).toContain('Service')
  })

  it('uses Date.now() when createdAt is null/undefined', () => {
    mockContext.currentUser = { id: 'me' }
    const beforeTime = new Date()
    mockContext.getUserTrades.mockReturnValue([
      { id: 't9', serviceId: 's1', offererId: 'me', requesterId: 'u-other', scheduledDate: null, createdAt: null },
    ])
    mockContext.getServiceById.mockReturnValue({ title: 'Service', duration: 60 })
    mockContext.getUserById.mockReturnValue({ name: 'Other' })

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    const pre = screen.getByTestId('fc-events')
    const events = JSON.parse(pre.textContent || '[]')
    const eventStart = new Date(events[0].start)
    const afterTime = new Date()
    // start should be around now
    expect(eventStart.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
    expect(eventStart.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000)
  })

  it('navigates to message when event has conversationId', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([])

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('btn-click-conv'))
    expect(navigateMock).toHaveBeenCalledWith('/messages?conv=conv-1')
  })

  it('starts a conversation when needed and navigates', async () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([])
    mockContext.startConversation.mockResolvedValue('new-conv')

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('btn-click-startconv'))
    // startConversation is async; allow microtask queue to flush
    await Promise.resolve()
    expect(mockContext.startConversation).toHaveBeenCalledWith('u-other')
    expect(navigateMock).toHaveBeenCalledWith('/messages?conv=new-conv')
  })

  it('navigates to service when there is no conversation created', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([])

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('btn-click-service'))
    expect(navigateMock).toHaveBeenCalledWith('/services/s-1')
  })

  it('shows tooltip on mouse enter, updates on move and hides on leave', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([])

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('btn-mouse-enter'))
    const tip = document.querySelector('.fc-event-tooltip') as HTMLElement
    expect(tip).toBeTruthy()
    expect(tip.style.display).toBe('block')

    fireEvent.click(screen.getByTestId('btn-mouse-move'))
    expect(tip.style.left).toBe('99px')
    expect(tip.style.top).toBe('100px')

    fireEvent.click(screen.getByTestId('btn-mouse-leave'))
    expect(tip.style.display).toBe('none')
  })

  it('formats tooltip with status when present', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([])

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('btn-mouse-enter'))
    const tip = document.querySelector('.fc-event-tooltip') as HTMLElement
    expect(tip.innerHTML).toContain('Estado: OK')
  })

  it('formats tooltip with time range when both start and end exist', () => {
    mockContext.currentUser = { id: 'me' }
    mockContext.getUserTrades.mockReturnValue([])

    render(
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByTestId('btn-mouse-enter'))
    const tip = document.querySelector('.fc-event-tooltip') as HTMLElement
    // should include formatted start and end times
    expect(tip.innerHTML).toContain('2026')
  })
})

