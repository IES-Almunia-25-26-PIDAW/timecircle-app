export interface WSMessage {
  type: 'message' | 'presence' | 'typing' | 'unknown';
  id?: number;
  conversation_id?: number;
  sender_id?: number;
  sender_name?: string;
  sender_avatar?: string;
  content?: string;
  timestamp?: string;
  read?: boolean;
  user_id?: number;
  status?: string;
  typing?: boolean;
}

export interface WSClient {
  send: (obj: any) => void;
  subscribe: (conversationId: string | number) => void;
  unsubscribe: (conversationId: string | number) => void;
  sendMessage: (conversationId: string | number, content: string) => void;
  typing: (conversationId: string | number, isTyping: boolean) => void;
  heartbeat: (status: 'online' | 'away') => void;
  onMessage: (listener: (data: WSMessage) => void) => void;
  close: () => void;
  isConnected: () => boolean;
}

export function createWS(wsUrl: string): WSClient {
  let ws: WebSocket | null = null;
  let reconnectTimeout: any = null;
  const listeners: Array<(data: WSMessage) => void> = [];

  function connect() {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      // console.log('WS open');
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as WSMessage;
        // Determine message type
        if (!data.type) {
          data.type = data.id && data.conversation_id ? 'message' : 
                     data.user_id ? 'presence' : 'unknown';
        }
        // Call all listeners with the parsed message
        listeners.forEach(listener => {
          try {
            listener(data);
          } catch (e) {
            console.error('Error in WS listener:', e);
          }
        });
      } catch (e) {
        console.error('Error parsing WS message:', e);
      }
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

  function sendMessage(conversationId: string | number, content: string) {
    send({
      action: 'send_message',
      conversation_id: Number(conversationId),
      content: content.trim(),
    });
  }

  function typing(conversationId: string | number, isTyping: boolean) {
    send({ action: 'typing', conversation_id: Number(conversationId), is_typing: Boolean(isTyping) });
  }

  function heartbeat(status: 'online' | 'away' = 'online') {
    send({ action: 'heartbeat', status });
  }

  function close() {
    if (ws) ws.close();
    ws = null;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
  }

  function isConnected() {
    return ws !== null && ws.readyState === WebSocket.OPEN;
  }

  function onMessage(listener: (data: WSMessage) => void) {
    listeners.push(listener);
  }

  connect();

  return { send, subscribe, unsubscribe, sendMessage, typing, heartbeat, onMessage, close, isConnected };
}
