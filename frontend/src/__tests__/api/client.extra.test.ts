import { describe, it, expect, vi } from 'vitest'

describe('client extra branches', () => {
  it('getWsUrl uses wss for https BASE_URL', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_URL', 'https://secure.test')
    const client = await import('../../app/api/client')
    const url = client.getWsUrl('/path')
    expect(url).toBe('wss://secure.test/path')
    expect(client.BASE_URL).toBe('https://secure.test')
  })
})
