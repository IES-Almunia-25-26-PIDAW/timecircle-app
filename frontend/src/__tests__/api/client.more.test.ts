import { describe, it, expect, vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('client extra branches', () => {
  it('getWsUrl uses ws for http BASE_URL', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    const client = await import('../../app/api/client')
    const url = client.getWsUrl('/path')
    expect(url).toBe('ws://api.test/path')
    expect(client.BASE_URL).toBe('http://api.test')
  })

  it('apiFetch omits Content-Type when body is FormData', async () => {
    const origLocal = globalThis.localStorage
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() } as any)

    const fetchMock = vi.fn((url: string, opts?: any) => Promise.resolve({ ok: true, status: 200, json: async () => ({}) }))
    vi.stubGlobal('fetch', fetchMock)

    const client = await import('../../app/api/client')
    await client.apiFetch('/upload', { method: 'POST', body: new FormData() } as any)

    expect(fetchMock).toHaveBeenCalled()
    const calledOpts = fetchMock.mock.calls[0][1]
    expect(calledOpts.headers['Content-Type']).toBeUndefined()

    globalThis.localStorage = origLocal
  })

  it('apiFetch handles refresh fetch throwing (catch path)', async () => {
    const origLocal = globalThis.localStorage
    const origLocation = globalThis.location
    vi.stubGlobal('localStorage', { getItem: vi.fn((k:string)=> k==='tc_access' ? 'old' : 'old-refresh'), setItem: vi.fn(), removeItem: vi.fn() } as any)
    vi.stubGlobal('location', { href: '' } as any)

    const fetchMock = vi.fn((url: string, opts?: any) => {
      if (url?.endsWith('/api/auth/refresh/')) return Promise.reject(new Error('net'))
      return Promise.resolve({ ok: false, status: 401, json: async () => ({ detail: 'unauth' }) })
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = await import('../../app/api/client')
    const res = await client.apiFetch('/protected')
    expect(res).toBeNull()
    expect(globalThis.localStorage.removeItem).toHaveBeenCalled()
    expect(globalThis.location.href).toBe('/login')

    globalThis.localStorage = origLocal
    globalThis.location = origLocation
  })

  it('apiFetch refresh fallback uses original refresh when refresh missing', async () => {
    const origLocal = globalThis.localStorage
    vi.stubGlobal('localStorage', { getItem: vi.fn((k:string)=> k==='tc_access' ? 'old' : 'old-refresh'), setItem: vi.fn(), removeItem: vi.fn() } as any)

    const fetchMock = vi.fn((url: string, opts?: any) => {
      if (url?.endsWith('/api/auth/refresh/')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ access: 'new-only' }) })
      }
      // first request returns 401
      if (opts?.headers?.Authorization === 'Bearer old') return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
      // retry with new-access -> success
      if (opts?.headers?.Authorization === 'Bearer new-only') return Promise.resolve({ ok: true, status: 200, json: async () => ({ data: 'ok' }) })
      return Promise.resolve({ ok: false, status: 500, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    const client = await import('../../app/api/client')
    const result = await client.apiFetch('/protected')
    expect(result).toEqual({ data: 'ok' })
    // refresh fallback should call setItem for refresh with original 'old-refresh'
    expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('tc_access', 'new-only')
    expect(globalThis.localStorage.setItem).toHaveBeenCalledWith('tc_refresh', 'old-refresh')

    globalThis.localStorage = origLocal
  })
})
