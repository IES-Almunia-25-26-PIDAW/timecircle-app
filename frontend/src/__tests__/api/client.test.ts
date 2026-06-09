import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch } from '../../app/api/client'

describe('apiFetch client', () => {
  const origLocal = globalThis.localStorage
  const origLocation = globalThis.location

  beforeEach(() => {
    vi.restoreAllMocks()
    // simple mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    } as any)
    vi.stubGlobal('location', { href: '' } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.localStorage = origLocal
    globalThis.location = origLocation
  })

  it('returns JSON body when ok', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) })))

    const res = await apiFetch('/test')
    expect(res).toEqual({ ok: true })
    expect((globalThis.fetch as any)).toHaveBeenCalled()
  })

  it('returns null on 204', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 204, json: async () => ({}) })))
    const res = await apiFetch('/nothing')
    expect(res).toBeNull()
  })

  it('performs refresh flow on 401 and retries', async () => {
    // mock localStorage tokens
    (globalThis.localStorage.getItem as any).mockImplementation((k: string) => (k === 'tc_access' ? 'old-access' : 'old-refresh'))

    const fetchMock = vi.fn((url: string, opts?: any) => {
      if (url?.endsWith('/api/auth/refresh/')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ access: 'new-access', refresh: 'new-refresh' }) })
      }
      // first request with old-access -> 401
      if (opts?.headers?.Authorization === 'Bearer old-access') {
        return Promise.resolve({ ok: false, status: 401, json: async () => ({ detail: 'unauth' }) })
      }
      // retry with new-access -> success
      if (opts?.headers?.Authorization === 'Bearer new-access') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: 'ok' }) })
      }
      return Promise.resolve({ ok: false, status: 500, json: async () => ({ detail: 'err' }) })
    })

    vi.stubGlobal('fetch', fetchMock)

    const res = await apiFetch('/protected')
    expect(res).toEqual({ data: 'ok' })
    expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('tc_access', 'new-access')
    expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('tc_refresh', 'new-refresh')
  })

  it('clears tokens and redirects on failed refresh', async () => {
    (globalThis.localStorage.getItem as any).mockImplementation((k: string) => (k === 'tc_access' ? 'old-access' : 'old-refresh'))

    const fetchMock = vi.fn((url: string, opts?: any) => {
      if (url?.endsWith('/api/auth/refresh/')) {
        return Promise.resolve({ ok: false, status: 400, json: async () => ({ detail: 'bad' }) })
      }
      // initial request returns 401
      return Promise.resolve({ ok: false, status: 401, json: async () => ({ detail: 'unauth' }) })
    })

    vi.stubGlobal('fetch', fetchMock)

    const res = await apiFetch('/protected')
    expect(res).toBeNull()
    expect(globalThis.localStorage.removeItem).toHaveBeenCalled()
    expect(globalThis.location.href).toBe('/login')
  })

  it('throws parsed error when non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 400, json: async () => ({ detail: 'bad' }) })))
    await expect(apiFetch('/bad')).rejects.toEqual({ detail: 'bad' })
  })

  it('throws empty error object when error json fails to parse', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 400, json: async () => { throw new Error('invalid json') } })))
    await expect(apiFetch('/bad-json')).rejects.toEqual({ detail: 'Error desconocido' })
  })

  it('propagates network error from fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network failed'))))
    await expect(apiFetch('/network-fail')).rejects.toThrow('network failed')
  })
})
