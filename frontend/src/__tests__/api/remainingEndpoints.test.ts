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

describe('Remaining API endpoints', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('apiRegister sets refresh tokens when response contains tokens', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ tokens: { access: 'a1', refresh: 'r1' } })
    await endpoints.apiRegister({
      username: 'u',
      email: 'u@example.com',
      first_name: 'First',
      last_name: 'Last',
      password: 'pass',
      password2: 'pass',
    })
    expect(client.apiFetch).toHaveBeenCalledWith('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        username: 'u',
        email: 'u@example.com',
        first_name: 'First',
        last_name: 'Last',
        password: 'pass',
        password2: 'pass',
      }),
    })
    expect(client.setTokens).toHaveBeenCalledWith('a1', 'r1')
  })

  it('apiGetMe and apiUpdateMe call the correct auth endpoints', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ user: true })
    await endpoints.apiGetMe()
    expect(client.apiFetch).toHaveBeenCalledWith('/api/auth/me/')
    await endpoints.apiUpdateMe({ name: 'new' })
    expect(client.apiFetch).toHaveBeenCalledWith('/api/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'new' }),
    })
  })

  it('apiGetWSPresenceHandshake posts to handshake endpoint', async () => {
    ;(client.apiFetch as any).mockResolvedValue({ token: 'ws' })
    await endpoints.apiGetWSPresenceHandshake()
    expect(client.apiFetch).toHaveBeenCalledWith('/api/auth/ws-handshake/', { method: 'POST' })
  })

  it('user-related endpoints build paths correctly', async () => {
    ;(client.apiFetch as any).mockResolvedValue({})
    await endpoints.apiGetUserRanking()
    expect(client.apiFetch).toHaveBeenCalledWith('/api/users/ranking/')
    await endpoints.apiGetUserActivity()
    expect(client.apiFetch).toHaveBeenCalledWith('/api/users/activity/')
    await endpoints.apiGetUserTransactions()
    expect(client.apiFetch).toHaveBeenCalledWith('/api/users/transactions/')
    await endpoints.apiGetUserServices(21)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/users/21/services/')
    await endpoints.apiGetUserReviews(21)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/users/21/reviews/')
  })

  it('apiGetCategories returns categories path', async () => {
    ;(client.apiFetch as any).mockResolvedValue([])
    await endpoints.apiGetCategories()
    expect(client.apiFetch).toHaveBeenCalledWith('/api/categories/?page_size=50')
  })

  it('review endpoints call the correct endpoints', async () => {
    ;(client.apiFetch as any).mockResolvedValue({})
    await endpoints.apiGetReviews('rating=5')
    expect(client.apiFetch).toHaveBeenCalledWith('/api/reviews/?rating=5')
    const payload = { review: 'nice' }
    await endpoints.apiCreateReview(payload)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/reviews/', { method: 'POST', body: JSON.stringify(payload) })
  })

  it('admin endpoints use correct admin routes', async () => {
    ;(client.apiFetch as any).mockResolvedValue({})
    await endpoints.apiAdminGetStats()
    expect(client.apiFetch).toHaveBeenCalledWith('/api/admin/stats/')
    await endpoints.apiAdminGetUsers('page=2')
    expect(client.apiFetch).toHaveBeenCalledWith('/api/admin/users/?page=2')
    const updateData = { active: true }
    await endpoints.apiAdminUpdateUser(10, updateData)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/admin/users/10/', {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    })
    await endpoints.apiAdminDeleteUser(11)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/admin/users/11/', { method: 'DELETE' })
    await endpoints.apiAdminActivateUser(11)
    expect(client.apiFetch).toHaveBeenCalledWith('/api/admin/users/11/activate/', { method: 'PATCH' })
  })

  it('apiSendContactMessage returns json on 201', async () => {
    const contact = { name: 'A', email: 'a@example.com', reason: 'help', message: 'hi' }
    const fetchMock = vi.fn(() => Promise.resolve({ status: 201, json: async () => ({ okay: true }) }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await endpoints.apiSendContactMessage(contact)
    expect(res).toEqual({ okay: true })
    expect(fetchMock).toHaveBeenCalledWith('https://timecircle-app.onrender.com/api/contact/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact),
    })
  })

  it('apiSendContactMessage throws parsed error on non-201 response', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ status: 400, json: async () => ({ error: 'bad' }) }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      endpoints.apiSendContactMessage({ name: 'A', email: 'a', reason: 'x', message: 'm' })
    ).rejects.toEqual({ error: 'bad' })
  })

  it('apiSendContactMessage throws empty object when contact error json fails', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ status: 400, json: async () => { throw new Error('bad json') } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      endpoints.apiSendContactMessage({ name: 'A', email: 'a', reason: 'x', message: 'm' })
    ).rejects.toEqual({})
  })
})
