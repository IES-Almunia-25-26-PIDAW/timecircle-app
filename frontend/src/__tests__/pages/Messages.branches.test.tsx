import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

import { Messages } from '../../app/pages/Messages'

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

describe('Messages branches', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows waiting text when cannot accept (lastProposedBy is me)', async () => {
    const { apiGetConversation } = await import('../../app/api/endpoints') as any
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }
    const conv = { id: 'b1', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    const tradeMsg = {
      id: 301,
      sender: { id: 'other' },
      content: 'Proposal',
      message_type: 'trade_proposal',
      timestamp: new Date().toISOString(),
      trade: {
        id: 99,
        service: { id: 7 },
        offerer: { id: 'other' },
        requester: { id: 'me' },
        status: 'pending',
        scheduled_date: new Date().toISOString(),
        credits_amount: 1,
        notes: 'Note',
        last_proposed_by: { id: 'me' },
      }
    }

    apiGetConversation.mockResolvedValue({ messages: [tradeMsg] })

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => id === 'other' ? other : null,
      getWsClient: () => undefined,
    }

    render(
      <MemoryRouter initialEntries={["/messages?conv=b1"]}>
        <Messages />
      </MemoryRouter>
    )

    expect(await screen.findByText(/Esperando respuesta/i)).toBeInTheDocument()
  })

  it('displays online presence in header when api returns online', async () => {
    const { apiGetConversation } = await import('../../app/api/endpoints') as any
    const apiClient = await import('../../app/api/client') as any
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }
    const conv = { id: 'b2', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    apiGetConversation.mockResolvedValue({ messages: [] })
    // apiFetch will be used by apiGetPresence; return online
    apiClient.apiFetch.mockResolvedValue({ status: 'online', is_typing: false })

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => other,
      getWsClient: () => undefined,
    }

    render(
      <MemoryRouter initialEntries={["/messages?conv=b2"]}>
        <Messages />
      </MemoryRouter>
    )

    expect(await screen.findByText(/En línea|En linea/i)).toBeInTheDocument()
  })

  it('restores message when websocket not connected on send', async () => {
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }
    const conv = { id: 'b3', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    const wsClient = { isConnected: () => false, subscribe: vi.fn(), unsubscribe: vi.fn() }

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => other,
      getWsClient: () => wsClient,
    }

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    render(
      <MemoryRouter initialEntries={["/messages?conv=b3"]}>
        <Messages />
      </MemoryRouter>
    )

    const input = await screen.findByPlaceholderText(/Escribe a/i)
    fireEvent.change(input, { target: { value: 'hello' } })
    const form = input.closest('form') as HTMLFormElement
    fireEvent.submit(form)

    // should warn and restore text
    expect(warnSpy).toHaveBeenCalled()
    expect((input as HTMLInputElement).value).toBe('hello')
    warnSpy.mockRestore()
  })

  it('shows loader while initial messages are loading', async () => {
    const { apiGetConversation } = await import('../../app/api/endpoints') as any
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }
    const conv = { id: 'b4', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    // Create a deferred promise so we can assert loader presence before resolving
    let resolveFn: any
    const p = new Promise((res) => { resolveFn = res })
    apiGetConversation.mockImplementation(() => p)

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => other,
      getWsClient: () => undefined,
    }

    const { container } = render(
      <MemoryRouter initialEntries={["/messages?conv=b4"]}>
        <Messages />
      </MemoryRouter>
    )

    // Loader uses an element with class 'animate-spin'
    expect(container.querySelector('.animate-spin')).toBeTruthy()

    // resolve the fetch and wait for loader to disappear
    resolveFn({ messages: [] })
    // allow effects to run
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('.animate-spin')).toBeFalsy()
  })

  it('falls back to Desconectado when presence API errors', async () => {
    const { apiGetConversation } = await import('../../app/api/endpoints') as any
    const apiClient = await import('../../app/api/client') as any
    const user = { id: 'me', name: 'Me' }
    const other = { id: 'other', name: 'Other', avatar: '', rating: 4.5, completedTrades: 2 }
    const conv = { id: 'b5', participants: ['me', 'other'], lastMessage: '', lastTimestamp: new Date().toISOString(), unreadCount: 0 }

    apiGetConversation.mockResolvedValue({ messages: [] })
    apiClient.apiFetch.mockRejectedValue(new Error('boom'))

    mockContext = {
      ...mockContext,
      currentUser: user,
      getUserConversations: () => [conv],
      getUserById: (id: string) => other,
      getWsClient: () => undefined,
    }

    render(
      <MemoryRouter initialEntries={["/messages?conv=b5"]}>
        <Messages />
      </MemoryRouter>
    )

    expect(await screen.findByText(/Desconectado/i)).toBeInTheDocument()
  })
})
