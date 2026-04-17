import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { MessageCircle, Send, Search, ArrowLeft, Loader2, Circle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Conversation, Message } from '../data/mockData';
import { apiGetConversation } from '../api/endpoints';

// ── Map raw API message ───────────────────────────────────
const mapApiMsg = (m: any, convId: string): Message => ({
  id: String(m.id),
  conversationId: convId,
  senderId: String(m.sender?.id ?? m.sender ?? ''),
  content: m.content,
  timestamp: m.timestamp,
  read: m.read ?? false,
});

// ── Online: other user sent a message in the last 15 min ─
function useOtherOnline(messages: Message[], otherUserId?: string): boolean {
  if (!otherUserId || !messages.length) return false;
  const threshold = 15 * 60 * 1000;
  const theirMsgs = messages.filter(m => m.senderId === otherUserId);
  if (!theirMsgs.length) return false;
  const last = theirMsgs[theirMsgs.length - 1];
  return Date.now() - new Date(last.timestamp).getTime() < threshold;
}

// Online status based purely on lastTimestamp (for sidebar, no messages loaded)
function onlineFromConvTimestamp(conv: Conversation): boolean {
  if (!conv.lastTimestamp) return false;
  return Date.now() - new Date(conv.lastTimestamp).getTime() < 15 * 60 * 1000;
}

// ── Typing dots ───────────────────────────────────────────
const TypingDots: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center gap-1.5">
    {label && <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: '0.78rem' }}>{label}</span>}
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400"
        style={{ animation: `tcTypingBounce 1.1s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }}
      />
    ))}
  </div>
);

// Typing bubble inside the chat (other user)
const TypingBubble: React.FC<{ avatar: string; name: string }> = ({ avatar, name }) => (
  <div className="flex justify-start items-end gap-2" style={{ animation: 'tcMsgLeft 0.22s ease-out' }}>
    <img src={avatar} alt="" className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 flex-shrink-0" />
    <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
      <span className="text-slate-500 dark:text-slate-400" style={{ fontSize: '0.78rem' }}>{name} está escribiendo</span>
      {[0, 1, 2].map(i => (
        <span key={i} className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" style={{ animation: `tcTypingBounce 1.1s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  </div>
);

// ── New messages separator ────────────────────────────────
const NewMessagesSeparator: React.FC = () => (
  <div className="flex items-center gap-3 my-2 px-1" style={{ animation: 'tcFadeIn 0.3s ease-out' }}>
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
  isTyping: boolean;
  onClick: () => void;
}> = ({ conv, selected, isTyping, onClick }) => {
  const { currentUser, getUserById } = useApp();
  const otherId = conv.participants.find(p => p !== currentUser?.id)!;
  const other = getUserById(otherId);
  const isOnline = onlineFromConvTimestamp(conv);

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
        <img src={other?.avatar} alt="" className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700" />
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 transition-colors duration-500 ${
            isOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        />
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center" style={{ fontSize: '0.6rem' }}>
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
              ? new Date(conv.lastTimestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
              : ''}
          </span>
        </div>

        {isTyping ? (
          <TypingDots />
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

// ── Main component ────────────────────────────────────────
export const Messages: React.FC = () => {
  const {
    currentUser,
    getUserConversations,
    sendMessage,
    markConversationRead,
    getUserById,
  } = useApp();

  const [searchParams] = useSearchParams();
  const initConv = searchParams.get('conv');

  const [selectedConvId, setSelectedConvId] = useState<string | null>(initConv);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [showSidebar, setShowSidebar] = useState(!initConv);

  // Messages managed locally with polling — bypasses context cache
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // IDs present when conversation was opened (for "new messages" separator)
  const openSnapshotIds = useRef<Set<string>>(new Set());

  // Typing state for the other user:
  // True when polling detects a new message that just arrived (< 1.2s ago before revealing it)
  const [otherTyping, setOtherTyping] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Buffer of messages waiting to be revealed after the typing indicator
  const pendingReveal = useRef<Message[]>([]);

  // Send button pulse
  const [sendPulse, setSendPulse] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversations = getUserConversations(currentUser?.id ?? '');

  // ── Fetch & merge messages via REST ──────────────────────
  const fetchMessages = useCallback(async (convId: string, isInitial = false) => {
    try {
      const conv = await apiGetConversation(convId);
      if (!conv?.messages) return;
      const fetched: Message[] = conv.messages.map((m: any) => mapApiMsg(m, convId));

      if (isInitial) {
        setMessages(fetched);
        openSnapshotIds.current = new Set(fetched.map(m => m.id));
        markConversationRead(convId);
        return;
      }

      // Detect incoming messages from the other user that weren't there before
      setMessages(prev => {
        const prevIds = new Set(prev.map(m => m.id));
        const incoming = fetched.filter(m => !prevIds.has(m.id) && m.senderId !== currentUser?.id);

        if (incoming.length > 0) {
          // Show typing bubble for 1.2 s, then reveal the actual message
          setOtherTyping(true);
          pendingReveal.current = incoming;
          if (revealTimer.current) clearTimeout(revealTimer.current);
          revealTimer.current = setTimeout(() => {
            setOtherTyping(false);
            setMessages(latest => {
              const latestIds = new Set(latest.map(m => m.id));
              const toAdd = pendingReveal.current.filter(m => !latestIds.has(m.id));
              pendingReveal.current = [];
              return toAdd.length > 0 ? [...latest, ...toAdd] : latest;
            });
          }, 1200);
          return prev; // keep previous state until timer fires
        }

        // Reconcile any local "fake" messages with real ones from server
        // (swap local-* IDs with real IDs when the server confirms them)
        const localMsgs = prev.filter(m => m.id.startsWith('local-'));
        if (localMsgs.length > 0) {
          const realFromMe = fetched.filter(m => m.senderId === currentUser?.id && !prevIds.has(m.id));
          if (realFromMe.length > 0) {
            // Remove fake, add real
            const withoutFakes = prev.filter(m => !m.id.startsWith('local-'));
            const alreadyIn = new Set(withoutFakes.map(m => m.id));
            const toAdd = fetched.filter(m => !alreadyIn.has(m.id));
            return [...withoutFakes, ...toAdd];
          }
        }

        return prev;
      });
    } catch {
      // Silently fail on poll errors
    }
  }, [currentUser?.id, markConversationRead]);

  // ── Initial load + poll every 4 s ────────────────────────
  useEffect(() => {
    if (!selectedConvId) return;
    setLoadingMsgs(true);
    fetchMessages(selectedConvId, true).finally(() => setLoadingMsgs(false));

    const interval = setInterval(() => fetchMessages(selectedConvId, false), 4000);
    return () => {
      clearInterval(interval);
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, [selectedConvId, fetchMessages]);

  // ── Auto-scroll ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  // ── Send ─────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConvId) return;
    const text = messageText.trim();
    setMessageText('');
    setSendPulse(true);
    setTimeout(() => setSendPulse(false), 600);

    // Optimistic local message for instant UI feedback
    const optimisticId = `local-${Date.now()}`;
    const optimistic: Message = {
      id: optimisticId,
      conversationId: selectedConvId,
      senderId: currentUser?.id ?? '',
      content: text,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, optimistic]);
    openSnapshotIds.current.add(optimisticId); // Don't treat our own as "new"

    await sendMessage(selectedConvId, text);
    inputRef.current?.focus();
  };

  // ── Helpers ──────────────────────────────────────────────
  const selectConv = (convId: string) => {
    setSelectedConvId(convId);
    setShowSidebar(false);
    setMessages([]);
    setOtherTyping(false);
    openSnapshotIds.current = new Set();
    pendingReveal.current = [];
    if (revealTimer.current) clearTimeout(revealTimer.current);
  };

  if (!currentUser) return null;

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const otherUserId = selectedConv?.participants.find(p => p !== currentUser.id);
  const otherUser = otherUserId ? getUserById(otherUserId) : null;
  const otherIsOnline = useOtherOnline(messages, otherUserId);
  const iAmTyping = messageText.length > 0;

  // First message index that is NOT in the open-snapshot (= new message)
  let firstNewIdx = -1;
  for (let i = 0; i < messages.length; i++) {
    if (!openSnapshotIds.current.has(messages[i].id)) {
      firstNewIdx = i;
      break;
    }
  }

  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    const othId = c.participants.find(p => p !== currentUser.id)!;
    const other = getUserById(othId);
    return other?.name.toLowerCase().includes(search.toLowerCase());
  });

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

        {/* ── Conversations sidebar ── */}
        <div className={`w-full sm:w-72 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 flex flex-col ${!showSidebar ? 'hidden sm:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-slate-900 dark:text-slate-100 mb-3" style={{ fontSize: '1rem', fontWeight: 700 }}>Mensajes</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
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
                <p style={{ fontSize: '0.75rem' }}>Inicia una conversación desde el perfil de un vecino</p>
              </div>
            ) : (
              filteredConvs.map(conv => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  selected={conv.id === selectedConvId}
                  isTyping={conv.id === selectedConvId && otherTyping}
                  onClick={() => selectConv(conv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${showSidebar ? 'hidden sm:flex' : 'flex'}`}>
          {selectedConv && otherUser ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button onClick={() => setShowSidebar(true)} className="sm:hidden text-slate-500 dark:text-slate-400 mr-1">
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="relative flex-shrink-0">
                  <img src={otherUser.avatar} alt="" className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700" />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 transition-colors duration-500 ${otherIsOnline ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-slate-900 dark:text-slate-100 font-semibold truncate" style={{ fontSize: '0.9rem' }}>
                    {otherUser.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', minHeight: '1rem' }}>
                    {otherTyping ? (
                      <TypingDots label={`${otherUser.name.split(' ')[0]} está escribiendo`} />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Circle className={`w-2 h-2 ${otherIsOnline ? 'fill-green-500 text-green-500' : 'fill-slate-300 text-slate-300 dark:fill-slate-600 dark:text-slate-600'}`} />
                        <span className={otherIsOnline ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                          {otherIsOnline ? 'En línea' : 'Desconectado'}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-slate-400">⭐ {otherUser.rating.toFixed(1)} · {otherUser.completedTrades} intercambios</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
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
                    <p className="text-slate-300 dark:text-slate-600 mt-1" style={{ fontSize: '0.8rem' }}>
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
                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                            {!isMe && (
                              <img src={otherUser.avatar} alt="" className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 flex-shrink-0" />
                            )}
                            <div className={isMe ? 'tc-msg-mine' : 'tc-msg-theirs'} style={{ maxWidth: '72%' }}>
                              <div className={`px-4 py-2.5 rounded-2xl ${isMe ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-sm'}`}>
                                <p style={{ fontSize: '0.875rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                  {msg.content}
                                </p>
                              </div>
                              <p className={`mt-1 ${isMe ? 'text-right text-slate-400' : 'text-slate-400'}`} style={{ fontSize: '0.65rem' }}>
                                {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {otherTyping && (
                      <TypingBubble avatar={otherUser.avatar} name={otherUser.name.split(' ')[0]} />
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* "I am typing" indicator + input */}
              <div className="border-t border-slate-100 dark:border-slate-800">
                {iAmTyping && (
                  <div className="px-5 pt-2 flex items-center gap-1.5" style={{ minHeight: '1.5rem' }}>
                    <TypingDots label="Escribiendo" />
                  </div>
                )}
                <form onSubmit={handleSend} className="p-4 flex gap-3 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
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
              <p className="mt-1" style={{ fontSize: '0.875rem' }}>o empieza una desde el perfil de un vecino</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};