import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createWS, type WSMessage } from '../../app/api/wsClient'

let originalWebSocket: typeof WebSocket | undefined
let lastMockWebSocket: MockWebSocket | null = null

class MockWebSocket {
  static OPEN = 1
  static CLOSED = 3
  readyState = MockWebSocket.OPEN
  url: string
  onopen: ((ev: Event) => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onclose: ((ev: Event) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
    lastMockWebSocket = this
  }

  send(payload: string) {
    this.sent.push(payload)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new Event('close'))
  }
}

describe('wsClient', () => {
  beforeEach(() => {
    originalWebSocket = globalThis.WebSocket
    globalThis.WebSocket = MockWebSocket as any
    lastMockWebSocket = null
  })

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket as any
    vi.restoreAllMocks()
  })

  it('creates a WebSocket client and sends subscription messages correctly', () => {
    const client = createWS('wss://example.com/socket')
    expect(lastMockWebSocket).not.toBeNull()
    expect(lastMockWebSocket?.url).toBe('wss://example.com/socket')

    client.subscribe('123')
    client.unsubscribe(321)
    client.typing('5', false)
    client.heartbeat()
    client.heartbeat('away')
    client.sendMessage('42', '  hello world  ')

    const parsed = lastMockWebSocket?.sent.map((item) => JSON.parse(item))
    expect(parsed).toEqual([
      { action: 'subscribe', conversation_id: 123 },
      { action: 'unsubscribe', conversation_id: 321 },
      { action: 'typing', conversation_id: 5, is_typing: false },
      { action: 'heartbeat', status: 'online' },
      { action: 'heartbeat', status: 'away' },
      { action: 'send_message', conversation_id: 42, content: 'hello world' },
    ])
  })

  it('reports connection status based on WebSocket readyState and closes correctly', () => {
    const client = createWS('wss://example.com/socket')
    expect(client.isConnected()).toBe(true)
    expect(lastMockWebSocket?.readyState).toBe(MockWebSocket.OPEN)

    client.close()
    expect(client.isConnected()).toBe(false)
    expect(lastMockWebSocket?.readyState).toBe(MockWebSocket.CLOSED)
  })

  it('dispatches onMessage listeners and derives message types when missing', () => {
    const client = createWS('wss://example.com/socket')
    const received: WSMessage[] = []

    client.onMessage((data) => received.push(data))

    lastMockWebSocket?.onmessage?.({
      data: JSON.stringify({ id: 1, conversation_id: 2, sender_id: 10, content: 'hi' }),
    })
    lastMockWebSocket?.onmessage?.({ data: JSON.stringify({ user_id: 3, status: 'online' }) })
    lastMockWebSocket?.onmessage?.({ data: JSON.stringify({}) })

    expect(received).toEqual([
      expect.objectContaining({ type: 'message', conversation_id: 2 }),
      expect.objectContaining({ type: 'presence', user_id: 3 }),
      expect.objectContaining({ type: 'unknown' }),
    ])
  })

  it('does not throw when a listener throws and logs the error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = createWS('wss://example.com/socket')
    let nextCalled = false

    client.onMessage(() => {
      throw new Error('listener fail')
    })
    client.onMessage(() => {
      nextCalled = true
    })

    lastMockWebSocket?.onmessage?.({ data: JSON.stringify({ user_id: 7 }) })

    expect(nextCalled).toBe(true)
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in WS listener:', expect.any(Error))
  })

  it('logs JSON parse errors and ignores invalid messages', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    createWS('wss://example.com/socket')
    lastMockWebSocket?.onmessage?.({ data: 'not json' })

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing WS message:', expect.any(Error))
  })
})
