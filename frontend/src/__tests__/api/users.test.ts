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

describe('Users endpoints', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('apiGetUsers calls apiFetch', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ results: [] })
    await endpoints.apiGetUsers()
    expect(client.apiFetch).toHaveBeenCalledWith('/api/users/?ordering=-completed_trades&page_size=100')
  })

  it('apiGetUser fetches by id', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ id: 12 })
    await endpoints.apiGetUser(12)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/users/12/')
  })
})
