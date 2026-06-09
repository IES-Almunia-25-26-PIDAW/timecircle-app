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

describe('Services endpoints', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('apiGetServices calls apiFetch with query string', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ results: [] })
    await endpoints.apiGetServices('page=2')
    expect(client.apiFetch).toHaveBeenCalledWith('/api/services/?page=2')
  })

  it('apiGetService calls apiFetch with id', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ id: 1 })
    await endpoints.apiGetService(1)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/services/1/')
  })

  it('apiCreateService posts data', async () => {
    const payload = { title: 'x' }
    ;(client.apiFetch as any).mockResolvedValue({ id: 5 })
    await endpoints.apiCreateService(payload)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/services/', { method: 'POST', body: JSON.stringify(payload) })
  })

  it('apiUpdateService patches data', async () => {
    const payload = { title: 'y' }
    ;(client.apiFetch as any).mockResolvedValue({ id: 5 })
    await endpoints.apiUpdateService(5, payload)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/services/5/', { method: 'PATCH', body: JSON.stringify(payload) })
  })

  it('apiDeleteService sends delete', async () => {
    ;(client.apiFetch as any).mockResolvedValue(null)
    await endpoints.apiDeleteService(9)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/services/9/', { method: 'DELETE' })
  })
})
