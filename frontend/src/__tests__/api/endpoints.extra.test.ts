import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as client from '../../app/api/client'
import * as endpoints from '../../app/api/endpoints'

describe('endpoints extra branches', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('apiRegister sets tokens when tokens present', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue({ tokens: { access: 'a', refresh: 'b' } })
    const spySet = vi.spyOn(client, 'setTokens')
    await endpoints.apiRegister({ username: 'u', email: 'e', first_name: 'f', last_name: 'l', password: 'p', password2: 'p' } as any)
    expect(spySet).toHaveBeenCalledWith('a', 'b')
  })

  it('apiConfirmPasswordReset success and failure', async () => {
    const okMock = vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) }))
    vi.stubGlobal('fetch', okMock)
    const res = await endpoints.apiConfirmPasswordReset('a@b', 'code', 'pw')
    expect(res).toEqual({ ok: true })

    const failMock = vi.fn(() => Promise.resolve({ ok: false, status: 400, json: async () => ({ error: 'bad' }) }))
    vi.stubGlobal('fetch', failMock)
    await expect(endpoints.apiConfirmPasswordReset('a@b', 'c', 'pw')).rejects.toEqual({ error: 'bad' })
  })

  it('apiSendContactMessage success and non-201 throw', async () => {
    const ok = vi.fn(() => Promise.resolve({ status: 201, json: async () => ({ sent: true }) }))
    vi.stubGlobal('fetch', ok)
    const r = await endpoints.apiSendContactMessage({ name: 'n', email: 'e', reason: 'r', message: 'm' })
    expect(r).toEqual({ sent: true })

    const bad = vi.fn(() => Promise.resolve({ status: 400, json: async () => ({ error: 'bad' }) }))
    vi.stubGlobal('fetch', bad)
    await expect(endpoints.apiSendContactMessage({ name: 'n', email: 'e', reason: 'r', message: 'm' })).rejects.toEqual({ error: 'bad' })
  })

  it('apiLogout handles missing refresh token without calling apiFetch', async () => {
    vi.spyOn(client, 'getTokens').mockReturnValue({ refresh: null })
    const apiSpy = vi.spyOn(client, 'apiFetch')
    const clearSpy = vi.spyOn(client, 'clearTokens')
    await endpoints.apiLogout()
    expect(apiSpy).not.toHaveBeenCalled()
    expect(clearSpy).toHaveBeenCalled()
  })
})
