/**
 * Messages.tsx — Mensajería con presencia y typing 100% real via polling REST.
 *
 * Flujo de presencia:
 *  - Heartbeat cada 30 s  →  POST /api/presence/heartbeat/  {status: 'online'|'away'}
 *  - Idle 10 min sin actividad  →  heartbeat con {status: 'away'}
 *  - Al escribir  →  POST /api/presence/typing/  {conversation_id, is_typing: true}
 *  - 3 s sin escribir  →  POST /api/presence/typing/  {is_typing: false}
 *  - Polling cada 3 s  →  GET /api/presence/?user_id=X&conversation_id=Y
 *    → devuelve {status: 'online'|'away'|'offline', is_typing: bool}
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { MessageCircle, Send, Search, ArrowLeft, Loader2, Circle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Conversation, Message } from '../data/mockData';
import { apiGetConversation } from '../api/endpoints';
import { apiFetch } from '../api/client';

// ── Tipos ─────────────────────────────────────────────────
type PresenceStatus = 'online' | 'away' | 'offline';

interface OtherPresence {
  status: PresenceStatus;
  is_typing: boolean;
}

// ── Presence API ──────────────────────────────────────────

/** Typing: informa al servidor si estás escribiendo en una conversación */
const apiTypingUpdate = (conversationId: string, isTyping: boolean): void => {
  apiFetch('/api/presence/typing/', {
    method: 'POST',
    body: JSON.stringify({ conversation_id: conversationId, is_typing: isTyping }),
  }).catch(() => {});
};

/** Presence: consulta el estado de otro usuario en una conversación */
const apiGetPresence = async (
  userId: string,
  conversationId: string,
): Promise<OtherPresence> => {
  try {
    return await apiFetch(
      `/api/presence/?user_id=${userId}&conversation_id=${conversationId}`,
    );
  } catch {
    return { status: 'offline', is_typing: false };
  }
};

// ── Map raw API message ───────────────────────────────────
const mapApiMsg = (m: any, convId: string): Message => ({
  id: String(m.id),
  conversationId: convId,
  senderId: String(m.sender?.id ?? m.sender ?? ''),
  content: m.content,
  timestamp: m.timestamp,
  read: m.read ?? false,
});

// ── Presence dot ──────────────────────────────────────────
const PresenceDot: React.FC<{ status: PresenceStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'sm',
}) => {
  const dim = size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  const color =
    status === 'online'
      ? 'bg-green-500'
      : status === 'away'
        ? 'bg-amber-400'
        : 'bg-slate-300 dark:bg-slate-600';
  return (
    <span
      className={`${dim} rounded-full border-2 border-white dark:border-slate-900 transition-colors duration-500 ${color}`}
    />
  );
};

const presenceLabel = (status: PresenceStatus) => {
  if (status === 'online') return { text: 'En línea',      cls: 'text-green-600 dark:text-green-400' };
  if (status === 'away')   return { text: 'Ausente',       cls: 'text-amber-500 dark:text-amber-400' };
  return                          { text: 'Desconectado',  cls: 'text-slate-400' };
};

// ── Typing dots ───────────────────────────────────────────
const TypingDots: React.FC<{ label?: string; color?: string }> = ({
  label,
  color = 'bg-teal-500 dark:bg-teal-400',
}) => (
  <span className="inline-flex items-center gap-1">
    {label && (
      <span className="text-slate-500 dark:text-slate-400 mr-0.5" style={{ fontSize: '0.78rem' }}>
        {label}
      </span>
    )}
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className={`inline-block w-1.5 h-1.5 rounded-full ${color}`}
        style={{
          animation: 'tcTypingBounce 1.1s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }}
      />
    ))}
  </span>
);

// Burbuja de "está escribiendo" en el chat
const TypingBubble: React.FC<{ avatar: string; name: string }> = ({ avatar, name }) => (
  <div className="flex justify-start items-end gap-2" style={{ animation: 'tcMsgLeft 0.22s ease-out' }}>
    <img
      src={avatar}
      alt=""
      className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 flex-shrink-0"
    />
    <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
      <TypingDots label={`${name} está escribiendo`} color="bg-slate-400" />
    </div>
  </div>
);

// ── New messages separator ────────────────────────────────
const NewMessagesSeparator: React.FC = () => (
  <div
    className="flex items-center gap-3 my-2 px-1"
    style={{ animation: 'tcFadeIn 0.3s ease-out' }}
  >
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-teal-400 to-teal-400 dark:via-teal-500 dark:to-teal-500" />
    <span
      className="flex-shrink-0 px-3 py-0.5 bg-teal-500 text-white rounded-full"
      style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.02em' }}
    >
      Mensajes nuevos
    </span>
    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-teal-400 to-teal-400 dark:via-teal-500 dark:to-teal-500" />
  </div>
);

// ── Conversation list item ────────────────────────────────
const ConvItem: React.FC<{
  conv: Conversation;
  selected: boolean;
  otherTyping: boolean;
  onClick: () => void;
}> = ({ conv, selected, otherTyping, onClick }) => {
  const { currentUser, getUserById } = useApp();
  const otherId = conv.participants.find((p) => p !== currentUser?.id)!;
  const other = getUserById(otherId);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 text-left transition-all duration-150 ${
        selected
          ? 'bg-teal-50 dark:bg-teal-950/30 border-r-2 border-teal-600'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className="relative flex-shrink-0">
        <img
          src={other?.avatar}
          alt=""
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700"
        />
        {conv.unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
            style={{ fontSize: '0.6rem' }}
          >
            {conv.unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={`text-slate-900 dark:text-slate-100 truncate ${conv.unreadCount > 0 ? 'font-semibold' : ''}`}
            style={{ fontSize: '0.875rem' }}
          >
            {other?.name || 'Usuario'}
          </span>
          <span className="text-slate-400 flex-shrink-0 ml-1" style={{ fontSize: '0.7rem' }}>
            {conv.lastTimestamp
              ? new Date(conv.lastTimestamp).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </span>
        </div>

        {otherTyping ? (
          <div style={{ minHeight: '1rem' }}>
            <TypingDots color="bg-teal-500" />
          </div>
        ) : (
          <p
            className={`truncate ${conv.unreadCount > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}
            style={{ fontSize: '0.8rem' }}
          >
            {conv.lastMessage || 'Nueva conversación'}
          </p>
        )}
      </div>
    </button>
  );
};

// ══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════

export const Messages: React.FC = () => {
  const { currentUser, getUserConversations, markConversationRead, getUserById, getWsClient } = useApp();

  const [searchParams] = useSearchParams();
  const initConv = searchParams.get('conv');

  const [selectedConvId, setSelectedConvId] = useState<string | null>(initConv);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [showSidebar, setShowSidebar] = useState(!initConv);

  // Messages state (managed locally with polling)
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const openSnapshotIds = useRef<Set<string>>(new Set());
  const hasMarkedReadRef = useRef<string | null>(null); // Track which conversation was marked as read

  // Real presence of the other user (from API poll)
  const [otherPresence, setOtherPresence] = useState<OtherPresence>({
    status: 'offline',
    is_typing: false,
  });

  // Typing send state
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);

  // Send button pulse
  const [sendPulse, setSendPulse] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversations = getUserConversations(currentUser?.id ?? '');

  // ── 2. TYPING SEND ────────────────────────────────────
  // Called whenever messageText changes (from the input handler).
  const handleTypingChange = useCallback(
    (text: string) => {
      setMessageText(text);
      if (!selectedConvId) return;

      if (text.length > 0) {
        // Send typing=true only once per "burst"
        if (!typingSentRef.current) {
          typingSentRef.current = true;
          apiTypingUpdate(selectedConvId, true);
        }
        // Reset the stop timer on every keystroke
        if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
        typingStopTimer.current = setTimeout(() => {
          typingSentRef.current = false;
          apiTypingUpdate(selectedConvId, false);
        }, 3000);
      } else {
        // Field cleared
        if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
        if (typingSentRef.current) {
          typingSentRef.current = false;
          apiTypingUpdate(selectedConvId, false);
        }
      }
    },
    [selectedConvId],
  );

  // ── 3. PRESENCE POLL (3 s) ────────────────────────────
  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const otherUserId = selectedConv?.participants.find((p) => p !== currentUser?.id);
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  useEffect(() => {
    if (!selectedConvId || !otherUserId) {
      setOtherPresence({ status: 'offline', is_typing: false });
      return;
    }

    // If websocket client exists, subscribe to conversation presence updates.
    const ws = getWsClient?.();
    if (ws) {
      try { ws.subscribe(selectedConvId); } catch (e) {}
    }

    // Polling para obtener presencia (se ejecuta siempre, como fallback para WS)
    const poll = async () => {
      const presence = await apiGetPresence(otherUserId, selectedConvId);
      setOtherPresence(presence);
    };

    poll();
    const interval = setInterval(poll, 3000);
    
    return () => {
      clearInterval(interval);
      if (ws) {
        try { ws.unsubscribe(selectedConvId); } catch (e) {}
      }
    };
  }, [selectedConvId, otherUserId]);

  // ── 4. MESSAGES FETCH + POLL (4 s) ────────────────────
  const fetchMessages = useCallback(
    async (convId: string, isInitial = false) => {
      try {
        const conv = await apiGetConversation(convId);
        if (!conv?.messages) return;
        const fetched: Message[] = conv.messages.map((m: any) => mapApiMsg(m, convId));

        if (isInitial) {
          setMessages(fetched);
          openSnapshotIds.current = new Set(fetched.map((m) => m.id));
          // Mark as read only once per conversation to avoid 429 Too Many Requests
          if (hasMarkedReadRef.current !== convId) {
            hasMarkedReadRef.current = convId;
            markConversationRead(convId).catch(() => {});
          }
          return;
        }

        setMessages((prev) => {
          const prevIds = new Set(prev.map((m) => m.id));
          const incoming = fetched.filter((m) => !prevIds.has(m.id));
          if (incoming.length === 0) return prev;
          return [...prev, ...incoming];
        });
      } catch {
        // Silently ignore poll errors
      }
    },
    [markConversationRead],
  );

  useEffect(() => {
    if (!selectedConvId) return;
    
    // Load initial messages via REST (fallback if WS unavailable)
    setLoadingMsgs(true);
    fetchMessages(selectedConvId, true).finally(() => setLoadingMsgs(false));

    // Subscribe to real-time messages via WebSocket
    const ws = getWsClient?.();
    if (ws) {
      try {
        ws.subscribe(selectedConvId);
        // Listen for new messages from WebSocket
        const handleWSMessage = (msg: any) => {
          if (msg?.type === 'message' && msg?.conversation_id === Number(selectedConvId)) {
            // Add new message from WebSocket
            const newMsg: Message = {
              id: String(msg.id),
              conversationId: String(msg.conversation_id),
              senderId: String(msg.sender_id),
              content: msg.content,
              timestamp: msg.timestamp,
              read: msg.read ?? false,
            };
            setMessages((prev) => {
              const exists = prev.some(m => m.id === newMsg.id);
              return exists ? prev : [...prev, newMsg];
            });
            // Auto-scroll to new message
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
        };
        ws.onMessage(handleWSMessage);
        return () => {
          try { ws.unsubscribe(selectedConvId); } catch (e) {}
        };
      } catch (e) {
        // WS not available, polling will still work via fetchMessages
      }
    }

    // Note: Polling removed - WebSocket is the only real-time source
    // If WS unavailable, initial fetch above provides baseline data
    return () => {};
  }, [selectedConvId, fetchMessages, getWsClient]);

  // ── 5. AUTO-SCROLL ────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherPresence.is_typing]);

  // ── 6. SEND ───────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConvId) return;
    const text = messageText.trim();
    setMessageText('');

    // Stop typing signal immediately on send
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    if (typingSentRef.current) {
      typingSentRef.current = false;
      apiTypingUpdate(selectedConvId, false);
    }

    setSendPulse(true);
    setTimeout(() => setSendPulse(false), 600);

    // Send message via WebSocket (primary path, no REST fallback)
    const ws = getWsClient?.();
    if (ws && ws.isConnected?.()) {
      ws.sendMessage(selectedConvId, text);
    } else {
      // If WebSocket not connected, show error to user instead of silently failing
      console.warn('WebSocket not connected - cannot send message');
      setMessageText(text); // Restore text for retry
    }
    inputRef.current?.focus();
  };

  // ── 7. SELECT CONVERSATION ─────────────────────────────
  const selectConv = (convId: string) => {
    // Stop typing signal for previous conversation
    if (selectedConvId && typingSentRef.current) {
      typingSentRef.current = false;
      apiTypingUpdate(selectedConvId, false);
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);

    setSelectedConvId(convId);
    setShowSidebar(false);
    setMessages([]);
    setOtherPresence({ status: 'offline', is_typing: false });
    openSnapshotIds.current = new Set();
    hasMarkedReadRef.current = null; // Reset for new conversation
    setMessageText('');
  };

  if (!currentUser) return null;

  // First new message index (after snapshot)
  let firstNewIdx = -1;
  for (let i = 0; i < messages.length; i++) {
    if (!openSnapshotIds.current.has(messages[i].id)) {
      firstNewIdx = i;
      break;
    }
  }

  const filteredConvs = conversations.filter((c) => {
    if (!search) return true;
    const othId = c.participants.find((p) => p !== currentUser.id)!;
    const other = getUserById(othId);
    return other?.name.toLowerCase().includes(search.toLowerCase());
  });

  const presenceLbl = presenceLabel(otherPresence.status);

  return (
    <>
      <style>{`
        @keyframes tcTypingBounce {
          0%,60%,100% { transform:translateY(0);    opacity:.35; }
          30%          { transform:translateY(-4px); opacity:1;   }
        }
        @keyframes tcFadeIn {
          from { opacity:0; transform:translateY(5px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        @keyframes tcMsgRight {
          from { opacity:0; transform:translateX(10px) scale(.97); }
          to   { opacity:1; transform:translateX(0)    scale(1);   }
        }
        @keyframes tcMsgLeft {
          from { opacity:0; transform:translateX(-10px) scale(.97); }
          to   { opacity:1; transform:translateX(0)     scale(1);   }
        }
        @keyframes tcSendPulse {
          0%  { box-shadow:0 0 0 0   rgba(13,148,136,.6); }
          70% { box-shadow:0 0 0 9px rgba(13,148,136,0);  }
          100%{ box-shadow:0 0 0 0   rgba(13,148,136,0);  }
        }
        .tc-msg-mine   { animation:tcMsgRight .22s ease-out; }
        .tc-msg-theirs { animation:tcMsgLeft  .22s ease-out; }
        .tc-send-pulse { animation:tcSendPulse .5s ease-out; }
      `}</style>

      <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">

        {/* ── Sidebar ── */}
        <div
          className={`w-full sm:w-72 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 flex flex-col ${
            !showSidebar ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h2
              className="text-slate-900 dark:text-slate-100 mb-3"
              style={{ fontSize: '1rem', fontWeight: 700 }}
            >
              Mensajes
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversación..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-100"
                style={{ fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredConvs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 px-4">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p style={{ fontSize: '0.8rem' }}>No tienes mensajes aún</p>
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  selected={conv.id === selectedConvId}
                  otherTyping={conv.id === selectedConvId && otherPresence.is_typing}
                  onClick={() => selectConv(conv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Chat ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${showSidebar ? 'hidden sm:flex' : 'flex'}`}>
          {selectedConv && otherUser ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="sm:hidden text-slate-500 dark:text-slate-400 mr-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative flex-shrink-0">
                  <img
                    src={otherUser.avatar}
                    alt=""
                    className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700"
                  />
                  <span className="absolute bottom-0 right-0">
                    <PresenceDot status={otherPresence.status} size="md" />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="text-slate-900 dark:text-slate-100 font-semibold truncate"
                    style={{ fontSize: '0.9rem' }}
                  >
                    {otherUser.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', minHeight: '1rem' }}>
                    {otherPresence.is_typing ? (
                      <TypingDots
                        label={`${otherUser.name.split(' ')[0]} está escribiendo`}
                        color="bg-teal-500 dark:bg-teal-400"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Circle
                          className={`w-2 h-2 ${
                            otherPresence.status === 'online'
                              ? 'fill-green-500 text-green-500'
                              : otherPresence.status === 'away'
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-slate-300 text-slate-300 dark:fill-slate-600 dark:text-slate-600'
                          }`}
                        />
                        <span className={presenceLbl.cls}>{presenceLbl.text}</span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-slate-400">
                          ⭐ {otherUser.rating.toFixed(1)} · {otherUser.completedTrades} intercambios
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {loadingMsgs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-3">
                      <MessageCircle className="w-7 h-7 text-teal-400" />
                    </div>
                    <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>Inicia la conversación</p>
                    <p
                      className="text-slate-300 dark:text-slate-600 mt-1"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Di hola a {otherUser.name.split(' ')[0]} 👋
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isMe = msg.senderId === currentUser.id;
                      const showSep = idx === firstNewIdx && firstNewIdx > 0;
                      return (
                        <React.Fragment key={msg.id}>
                          {showSep && <NewMessagesSeparator />}
                          <div
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
                          >
                            {!isMe && (
                              <img
                                src={otherUser.avatar}
                                alt=""
                                className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 flex-shrink-0"
                              />
                            )}
                            <div
                              className={isMe ? 'tc-msg-mine' : 'tc-msg-theirs'}
                              style={{ maxWidth: '72%' }}
                            >
                              <div
                                className={`px-4 py-2.5 rounded-2xl ${
                                  isMe
                                    ? 'bg-teal-600 text-white rounded-br-sm'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-sm'
                                }`}
                              >
                                <p
                                  style={{
                                    fontSize: '0.875rem',
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {msg.content}
                                </p>
                              </div>
                              <p
                                className={`mt-1 ${isMe ? 'text-right text-slate-400' : 'text-slate-400'}`}
                                style={{ fontSize: '0.65rem' }}
                              >
                                {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Typing bubble — visible when the OTHER user is typing */}
                    {otherPresence.is_typing && (
                      <TypingBubble
                        avatar={otherUser.avatar}
                        name={otherUser.name.split(' ')[0]}
                      />
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-slate-100 dark:border-slate-800">
                
                <form onSubmit={handleSend} className="p-4 flex gap-3 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageText}
                    onChange={(e) => handleTypingChange(e.target.value)}
                    placeholder={`Escribe a ${otherUser.name.split(' ')[0]}…`}
                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                    style={{ fontSize: '0.875rem' }}
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className={`flex-shrink-0 w-10 h-10 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors ${sendPulse ? 'tc-send-pulse' : ''}`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageCircle className="w-16 h-16 mb-3 opacity-20" />
              <p style={{ fontSize: '1rem' }}>Selecciona una conversación</p>
              <p className="mt-1" style={{ fontSize: '0.875rem' }}>
                o empieza una desde el perfil de un vecino
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};