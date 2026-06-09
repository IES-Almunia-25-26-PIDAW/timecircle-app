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

describe('Trades endpoints', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('apiGetTrades calls apiFetch with params', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ results: [] })
    await endpoints.apiGetTrades('status=active')
    expect(client.apiFetch).toHaveBeenCalledWith('/api/trades/?status=active')
  })

  it('apiCreateTrade posts payload', async () => {
    const payload = { service: 1 }
    ;(client.apiFetch as any).mockResolvedValue({ id: 2 })
    await endpoints.apiCreateTrade(payload)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/trades/', { method: 'POST', body: JSON.stringify(payload) })
  })

  it('apiUpdateTradeStatus patches status', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ ok: true })
    await endpoints.apiUpdateTradeStatus(3, 'confirmed')
    expect(client.apiFetch).toHaveBeenCalledWith('/api/trades/3/status/', { method: 'PATCH', body: JSON.stringify({ status: 'confirmed' }) })
  })

  it('trade start/confirm flow uses proper endpoints', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ ok: true })
    await endpoints.apiRequestTradeStart(7)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/trades/7/start/request/', { method: 'POST' })
    await endpoints.apiConfirmTradeStart(7)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/trades/7/start/confirm/', { method: 'POST' })
  })
})
