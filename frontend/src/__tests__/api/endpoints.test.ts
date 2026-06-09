import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We'll mock the client functions where appropriate
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

describe('api endpoints', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('apiLogin sets tokens when access present', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ access: 'a', refresh: 'b' })
    await endpoints.apiLogin('u', 'p')
    expect(client.apiFetch).toHaveBeenCalled()
    expect(client.setTokens).toHaveBeenCalledWith('a', 'b')
  })

  it('apiLogout clears tokens and calls logout when refresh present', async () => {
    ;(client.getTokens as any).mockReturnValue({ refresh: 'r' })
    ;(client.apiFetch as any).mockResolvedValue(undefined)
    await endpoints.apiLogout()
    expect(client.apiFetch).toHaveBeenCalled()
    expect(client.clearTokens).toHaveBeenCalled()
  })

  it('apiRequestPasswordReset forwards fetch response on success', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ sent: true }) }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await endpoints.apiRequestPasswordReset('me@example.com')
    expect(res).toEqual({ sent: true })
  })

  it('apiRequestPasswordReset throws on non-ok', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: false, status: 400, json: async () => ({ error: 'bad' }) }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(endpoints.apiRequestPasswordReset('x')).rejects.toEqual({ error: 'bad' })
  })
})
