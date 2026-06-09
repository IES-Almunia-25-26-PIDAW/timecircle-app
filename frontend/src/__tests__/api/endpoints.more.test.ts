import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock client before importing endpoints so named imports are mocked
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

describe('endpoints additional branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('apiLogin without access does not call setTokens', async () => {
    ;(client.apiFetch as any).mockResolvedValue({})
    await endpoints.apiLogin('u', 'p')
    expect(client.setTokens).not.toHaveBeenCalled()
  })

  it('apiRegister without tokens does not call setTokens', async () => {
    ;(client.apiFetch as any).mockResolvedValue({})
    await endpoints.apiRegister({ username: 'u', email: 'e', first_name: 'f', last_name: 'l', password: 'p', password2: 'p' } as any)
    expect(client.setTokens).not.toHaveBeenCalled()
  })

  it('apiLogout handles apiFetch rejection and still clears tokens', async () => {
    ;(client.getTokens as any).mockReturnValue({ refresh: 'r' })
    ;(client.apiFetch as any).mockRejectedValue(new Error('boom'))
    await expect(endpoints.apiLogout()).resolves.toBeUndefined()
    expect(client.clearTokens).toHaveBeenCalled()
  })

  it('apiGetTrades and apiGetReviews accept params and call apiFetch appropriately', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ results: [] })
    await endpoints.apiGetTrades()
    await endpoints.apiGetTrades('page=2')
    await endpoints.apiGetReviews()
    await endpoints.apiGetReviews('page=3')
    expect((client.apiFetch as any)).toHaveBeenCalled()
  })

  it('apiAdminGetUsers accepts params', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ results: [] })
    await endpoints.apiAdminGetUsers()
    await endpoints.apiAdminGetUsers('q=1')
    expect((client.apiFetch as any)).toHaveBeenCalledTimes(2)
  })
})
