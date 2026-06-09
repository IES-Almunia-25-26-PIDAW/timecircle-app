import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../app/api/client', async () => {
  const actual = await vi.importActual('../../app/api/client')
  return {
    ...actual,
    apiFetch: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    getTokens: vi.fn(),
  }
})

import * as client from '../../app/api/client'
import * as endpoints from '../../app/api/endpoints'

describe('Conversations endpoints', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('apiGetConversations calls apiFetch', async () => {
    ;(client.apiFetch as any).mockResolvedValue([])
    await endpoints.apiGetConversations()
    expect(client.apiFetch).toHaveBeenCalledWith('/api/conversations/')
  })

  it('apiCreateConversation posts participant ids', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ id: 4 })
    await endpoints.apiCreateConversation([1, 2])
    expect(client.apiFetch).toHaveBeenCalledWith('/api/conversations/', { method: 'POST', body: JSON.stringify({ participant_ids: [1, 2] }) })
  })

  it('apiSendMessage posts message content', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ id: 10 })
    await endpoints.apiSendMessage(5, 'hello')
    expect(client.apiFetch).toHaveBeenCalledWith('/api/conversations/5/messages/', { method: 'POST', body: JSON.stringify({ content: 'hello' }) })
  })

  it('apiMarkConversationRead patches read', async () => {
    ;(client.apiFetch as any).mockResolvedValue({})
    await endpoints.apiMarkConversationRead(8)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/conversations/8/read/', { method: 'PATCH' })
  })
})
