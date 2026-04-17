export function createWS(wsUrl: string, onMessage: (data: any) => void) {
  let ws: WebSocket | null = null;
  let reconnectTimeout: any = null;

  function connect() {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      // console.log('WS open');
    };
    ws.onmessage = (ev) => {
      try { onMessage(JSON.parse(ev.data)); } catch (e) {}
    };
    ws.onclose = () => {
      // don't auto-reconnect for now
      ws = null;
    };
    ws.onerror = () => {
      // ignore
    };
  }

  function send(obj: any) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  function subscribe(conversationId: string | number) {
    send({ action: 'subscribe', conversation_id: Number(conversationId) });
  }

  function unsubscribe(conversationId: string | number) {
    send({ action: 'unsubscribe', conversation_id: Number(conversationId) });
  }

  function typing(conversationId: string | number, isTyping: boolean) {
    send({ action: 'typing', conversation_id: Number(conversationId), is_typing: Boolean(isTyping) });
  }

  function heartbeat(status: 'online'|'away' = 'online') {
    send({ action: 'heartbeat', status });
  }

  function close() {
    if (ws) ws.close();
    ws = null;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
  }

  connect();

  return { send, subscribe, unsubscribe, typing, heartbeat, close };
}
