import React from 'react'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

import { Messages } from '../../app/pages/Messages'

// jsdom doesn't implement scrollIntoView — stub it to avoid errors during tests
(global as any).HTMLElement.prototype.scrollIntoView = function () { /* noop */ }

let mockContext: any = {
  currentUser: null,
  getUserConversations: () => [],
  getUserById: () => undefined,
  markConversationRead: () => Promise.resolve(),
  getWsClient: () => undefined,
}

vi.mock('../../app/context/AppContext', () => ({ useApp: () => mockContext }))

vi.mock('../../app/api/endpoints', () => ({ apiGetConversation: vi.fn() }))
vi.mock('../../app/api/client', () => ({ apiFetch: vi.fn() }))

describe('Messages', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows select conv placeholder when no conversation selected', () => {
    mockContext = { ...mockContext, currentUser: { id: 'me' }, getUserConversations: () => [] }
    render(
      <MemoryRouter>
        <Messages />
      </MemoryRouter>
    )
    expect(screen.getByText(/Selecciona una conversación/i)).toBeInTheDocument()
  })

  it('loads messages when conv id present in query and displays message', async () => {
    const { apiGetConversation } = await import('../../app/api/endpoints') as any
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }

    const conv = { id: 'c1', participants: ['me', 'other'], lastMessage: 'hi', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    apiGetConversation.mockResolvedValue({ messages: [ { id: 11, sender: { id: 'other' }, content: 'Hello there', message_type: 'text', timestamp: new Date().toISOString() } ] })

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => id === 'other' ? other : null,
      getWsClient: () => undefined,
    }

    render(
      <MemoryRouter initialEntries={["/messages?conv=c1"]}>
        <Messages />
      </MemoryRouter>
    )

    expect(await screen.findByText(/Hello there/i)).toBeInTheDocument()
  })

  it('sends message via websocket when connected', async () => {
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }
    const conv = { id: 'c2', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    const sendSpy = vi.fn()
    const wsClient = { isConnected: () => true, sendMessage: sendSpy, subscribe: vi.fn(), onMessage: vi.fn(), unsubscribe: vi.fn() }

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => other,
      getWsClient: () => wsClient,
    }

    render(
      <MemoryRouter initialEntries={["/messages?conv=c2"]}>
        <Messages />
      </MemoryRouter>
    )

    const input = await screen.findByPlaceholderText(/Escribe a/i)
    fireEvent.change(input, { target: { value: 'ping' } })

    const form = input.closest('form') as HTMLFormElement
    fireEvent.submit(form)

    expect(sendSpy).toHaveBeenCalledWith('c2', 'ping')
    // input should be cleared after send
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('handles reservation card actions: accept, cancel, negotiate', async () => {
    const { apiGetConversation } = await import('../../app/api/endpoints') as any

    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }
    const conv = { id: 'c3', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    const tradeMsg = {
      id: 21,
      sender: { id: 'other' },
      content: 'Reserva propuesta',
      message_type: 'trade_proposal',
      timestamp: new Date().toISOString(),
      trade: {
        id: 55,
        service: { id: 9 },
        offerer: { id: 'other' },
        requester: { id: 'me' },
        status: 'pending',
        scheduled_date: '2026-06-08T10:00:00Z',
        credits_amount: 2,
        notes: 'Initial note',
      },
    }

    apiGetConversation.mockResolvedValue({ messages: [tradeMsg] })

    const updateTrade = vi.fn().mockResolvedValue({})
    const negotiateTrade = vi.fn().mockResolvedValue({})
    const refreshConversationMessages = vi.fn().mockResolvedValue({})
    const refreshTrades = vi.fn().mockResolvedValue({})

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => id === 'other' ? other : null,
      getWsClient: () => undefined,
      updateTrade,
      negotiateTrade,
      refreshConversationMessages,
      refreshTrades,
    }

    render(
      <MemoryRouter initialEntries={["/messages?conv=c3"]}>
        <Messages />
      </MemoryRouter>
    )

    // Wait for reservation card to appear
    expect(await screen.findByText(/Propuesta de reserva/i)).toBeInTheDocument()

    // Toggle negotiate and submit a counterproposal
    const negoBtn = screen.getByRole('button', { name: /Negociar/i })
    fireEvent.click(negoBtn)

    const dateInput = await screen.findByTestId('reservation-date')
    const timeInput = await screen.findByTestId('reservation-time')
    const creditsInput = screen.getByTestId('reservation-credits')
    const notesInput = screen.getByTestId('reservation-notes')
    const messageInput = screen.getByTestId('reservation-message')

    fireEvent.change(creditsInput, { target: { value: '3' } })
    fireEvent.change(notesInput, { target: { value: 'Updated notes' } })
    fireEvent.change(messageInput, { target: { value: 'Please confirm' } })

    const sendNego = screen.getByRole('button', { name: /Enviar contrapropuesta/i })
    fireEvent.click(sendNego)

    expect(negotiateTrade).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByTestId('reservation-send-nego')).not.toBeInTheDocument())

    // Cancel (within the reservation card)
    const cardRoot = screen.getByTestId('reservation-card-55')
    const cancelBtn = within(cardRoot).getByRole('button', { name: /Cancelar/i })
    fireEvent.click(cancelBtn)
    expect(updateTrade).toHaveBeenCalledWith('55', { status: 'cancelled' })

    // Accept flow covered in a separate test
  })

  it('renders trade_status accepted and cancelled variants', async () => {
    const { apiGetConversation } = await import('../../app/api/endpoints') as any
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }
    const conv = { id: 'c4', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    const m1 = { id: 31, sender: { id: 'other' }, content: 'Aceptada!', message_type: 'trade_status', payload: { action: 'accepted' }, timestamp: new Date().toISOString() }
    const m2 = { id: 32, sender: { id: 'other' }, content: 'Rechazada!', message_type: 'trade_status', payload: { action: 'rejected' }, timestamp: new Date().toISOString() }

    apiGetConversation.mockResolvedValue({ messages: [m1, m2] })

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => other,
      getWsClient: () => undefined,
    }

    render(
      <MemoryRouter initialEntries={["/messages?conv=c4"]}>
        <Messages />
      </MemoryRouter>
    )

    expect(await screen.findByText(/Aceptada!/i)).toBeInTheDocument()
    expect(await screen.findByText(/Rechazada!/i)).toBeInTheDocument()
  })

  it('shows unread badge and typing dots in conversation list', () => {
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }
    const conv = { id: 'c5', participants: ['me', 'other'], lastMessage: 'Hola', lastTimestamp: new Date().toISOString(), unreadCount: 1 }

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => other,
      getWsClient: () => undefined,
    }

    render(
      <MemoryRouter>
        <Messages />
      </MemoryRouter>
    )

    // Unread badge with '1'
    expect(screen.getByText('1')).toBeInTheDocument()
    // Last message shown
    expect(screen.getByText(/Hola/i)).toBeInTheDocument()
  })

  it('handles reservation message actions: accept, cancel, negotiate', async () => {
    const { apiGetConversation } = await import('../../app/api/endpoints') as any
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }

    const conv = { id: 'c3', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    const tradeMsg = {
      id: 101,
      sender: { id: 'other' },
      content: 'Proposed',
      message_type: 'trade_proposal',
      timestamp: new Date().toISOString(),
      trade: {
        id: 55,
        service: { id: 7 },
        offerer: { id: 'other' },
        requester: { id: 'me' },
        status: 'pending',
        scheduled_date: new Date().toISOString(),
        credits_amount: 3,
        notes: 'Note',
        last_proposed_by: { id: 'other' }
      }
    }

    apiGetConversation.mockResolvedValue({ messages: [tradeMsg] })

    const updateTrade = vi.fn().mockResolvedValue(undefined)
    const negotiateTrade = vi.fn().mockResolvedValue(undefined)
    const refreshConversationMessages = vi.fn().mockResolvedValue(undefined)
    const refreshTrades = vi.fn().mockResolvedValue(undefined)

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => id === 'other' ? other : null,
      getWsClient: () => undefined,
      updateTrade,
      negotiateTrade,
      refreshConversationMessages,
      refreshTrades,
    }

    render(
      <MemoryRouter initialEntries={["/messages?conv=c3"]}>
        <Messages />
      </MemoryRouter>
    )

    // Reservation card appears
    expect(await screen.findByText(/Propuesta de reserva/i)).toBeInTheDocument()

    // Negotiate flow
    const negoBtn = screen.getByRole('button', { name: /Negociar/i })
    fireEvent.click(negoBtn)

    const dateInput = await screen.findByTestId('reservation-date')
    const messageInput = screen.getByTestId('reservation-message')
    fireEvent.change(messageInput, { target: { value: 'counter' } })

    const submitBtn = screen.getByRole('button', { name: /Enviar contrapropuesta/i })
    fireEvent.click(submitBtn)

    await expect(negotiateTrade).toHaveBeenCalled()

    // Accept action
    const acceptBtn = await screen.findByRole('button', { name: /Aceptar/i })
    fireEvent.click(acceptBtn)
    await expect(updateTrade).toHaveBeenCalled()
  })

  it('renders trade_status accepted and rejected styles', async () => {
    const { apiGetConversation } = await import('../../app/api/endpoints') as any
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }

    const conv = { id: 'c4', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    const accepted = {
      id: 201,
      sender: { id: 'other' },
      content: 'Accepted content',
      message_type: 'trade_status',
      payload: { action: 'accepted' },
      timestamp: new Date().toISOString(),
    }
    const rejected = {
      id: 202,
      sender: { id: 'other' },
      content: 'Rejected content',
      message_type: 'trade_status',
      payload: { action: 'rejected' },
      timestamp: new Date().toISOString(),
    }

    apiGetConversation.mockResolvedValue({ messages: [accepted, rejected] })

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => id === 'other' ? other : null,
      getWsClient: () => undefined,
    }

    render(
      <MemoryRouter initialEntries={["/messages?conv=c4"]}>
        <Messages />
      </MemoryRouter>
    )

    const acc = await screen.findByText(/Accepted content/i)
    const rej = await screen.findByText(/Rejected content/i)

    expect(acc).toBeInTheDocument()
    expect(rej).toBeInTheDocument()

    // accepted should have green-ish classes on the message container
    expect(acc.className).toMatch(/border-green-200|bg-green-50/)
    expect(rej.className).toMatch(/border-red-200|bg-red-50/)
  })
})
