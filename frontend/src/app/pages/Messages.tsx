import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import {
  MessageCircle, Send, Search, ArrowLeft, Loader2, Circle,
  Calendar, Clock, Coins, Check, X, Pencil,
} from 'lucide-react';
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
  messageType: m.message_type || 'text',
  trade: m.trade ? {
    id: String(m.trade.id),
    serviceId: String(m.trade.service?.id ?? m.trade.service ?? ''),
    offererId: String(m.trade.offerer?.id ?? m.trade.offerer ?? ''),
    requesterId: String(m.trade.requester?.id ?? m.trade.requester ?? ''),
    status: m.trade.status,
    scheduledDate: m.trade.scheduled_date || '',
    creditsAmount: m.trade.credits_amount ?? 0,
    createdAt: (m.trade.created_at || '').split('T')[0] || '',
    completedAt: m.trade.completed_at ? (m.trade.completed_at || '').split('T')[0] : undefined,
    notes: m.trade.notes || '',
    lastProposedById: m.trade.last_proposed_by ? String(m.trade.last_proposed_by?.id ?? m.trade.last_proposed_by) : undefined,
    lastProposedAt: m.trade.last_proposed_at || undefined,
    conversationId: m.trade.conversation_id ? String(m.trade.conversation_id) : undefined,
  } : undefined,
  payload: m.payload || undefined,
  timestamp: m.timestamp,
  read: m.read ?? false,
});

// ── Presence dot ──────────────────────────────────────────
const PresenceDot: React.FC<{ status: PresenceStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'sm',
}) => {
  const dim = size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  let color = 'bg-slate-300 dark:bg-slate-600';
  if (status === 'online') color = 'bg-green-500';
  else if (status === 'away') color = 'bg-amber-400';
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

const toDateInput = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};

const toTimeInput = (value?: string) => {
  if (!value) return '10:00';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '10:00';
  return d.toTimeString().slice(0, 5);
};

const combineDateTime = (date: string, time: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0).toISOString();
};

const ReservationMessageCard: React.FC<{
  msg: Message;
  isMe: boolean;
}> = ({ msg, isMe }) => {
  const {
    currentUser, updateTrade, negotiateTrade,
    refreshConversationMessages, refreshTrades,
  } = useApp();
  const trade = msg.trade;
  const payload = msg.payload || {};
  const status = trade?.status || payload.status;
  const scheduled = trade?.scheduledDate || payload.scheduled_date;
  const credits = trade?.creditsAmount ?? payload.credits_amount;
  const notes = trade?.notes ?? payload.notes;
  const serviceTitle = payload.service?.title || 'Intercambio';
  const lastProposedBy = trade?.lastProposedById || (payload.last_proposed_by ? String(payload.last_proposed_by) : undefined);
  const canAct = Boolean(trade?.id && status === 'pending');
  const canAccept = canAct && currentUser?.id !== lastProposedBy;
  const [negotiating, setNegotiating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(toDateInput(scheduled));
  const [time, setTime] = useState(toTimeInput(scheduled));
  const [draftCredits, setDraftCredits] = useState<number>(Number(credits || 1));
  const [draftNotes, setDraftNotes] = useState(notes || '');
  const [draftMessage, setDraftMessage] = useState('');

  const refresh = async () => {
    await refreshTrades();
    await refreshConversationMessages(msg.conversationId);
  };

  const accept = async () => {
    if (!trade?.id || !canAccept) return;
    setBusy(true);
    await updateTrade(trade.id, { status: 'accepted' });
    await refresh();
    setBusy(false);
  };

  const cancel = async () => {
    if (!trade?.id || !canAct) return;
    setBusy(true);
    await updateTrade(trade.id, { status: 'cancelled' });
    await refresh();
    setBusy(false);
  };

  const submitNegotiation = async () => {
    if (!trade?.id || !date || !time) return;
    setBusy(true);
    await negotiateTrade(trade.id, {
      scheduledDate: combineDateTime(date, time),
      creditsAmount: draftCredits,
      notes: draftNotes,
      message: draftMessage,
    });
    await refresh();
    setNegotiating(false);
    setBusy(false);
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    cancelled: 'Cancelada',
    in_progress: 'En curso',
    completed: 'Completada',
  };

  return (
    <div className={`rounded-2xl border p-3 shadow-sm ${
      isMe
        ? 'bg-teal-50 border-teal-200 text-slate-900'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            Propuesta de reserva
          </div>
          <div className="mt-1 font-semibold" style={{ fontSize: '0.92rem' }}>{serviceTitle}</div>
        </div>
        {(() => {
          let statusClass = 'bg-amber-100 text-amber-700';
          if (status === 'accepted') statusClass = 'bg-green-100 text-green-700';
          else if (status === 'cancelled') statusClass = 'bg-red-100 text-red-700';
          return (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
              {statusLabel[status] || status}
            </span>
          );
        })()}
      </div>

      <div className="mt-3 grid gap-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-teal-600" />
          {scheduled ? new Date(scheduled).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Sin fecha'}
          <Clock className="ml-2 w-4 h-4 text-teal-600" />
          {scheduled ? new Date(scheduled).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
        </div>
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Coins className="w-4 h-4 text-amber-500" />
          {credits} créditos
        </div>
        {notes && <div className="rounded-xl bg-white/70 dark:bg-slate-900/40 px-3 py-2 text-slate-600 dark:text-slate-300">{notes}</div>}
        {payload.message && payload.message !== notes && (
          <div className="text-slate-500 dark:text-slate-400">{payload.message}</div>
        )}
      </div>

      {canAct && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={accept}
            disabled={!canAccept || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-45"
          >
            <Check className="w-3.5 h-3.5" />
            Aceptar
          </button>
          <button
            type="button"
            onClick={() => setNegotiating(v => !v)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-45 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
          >
            <Pencil className="w-3.5 h-3.5" />
            Negociar
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-45 dark:bg-slate-900"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
        </div>
      )}

      {canAct && !canAccept && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Esperando respuesta de la otra persona.</p>
      )}

      {negotiating && (
        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:bg-slate-900 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-700" />
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="rounded-lg border px-2 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-700" />
          </div>
          <input type="number" min={1} max={20} value={draftCredits} onChange={e => setDraftCredits(Number(e.target.value))} className="w-full rounded-lg border px-2 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-700" />
          <textarea value={draftNotes} onChange={e => setDraftNotes(e.target.value)} rows={2} className="w-full resize-none rounded-lg border px-2 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-700" placeholder="Notas de la propuesta" />
          <input value={draftMessage} onChange={e => setDraftMessage(e.target.value)} className="w-full rounded-lg border px-2 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-700" placeholder="Mensaje opcional" />
          <button type="button" onClick={submitNegotiation} disabled={busy} className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Enviar contrapropuesta
          </button>
        </div>
      )}
    </div>
  );
};

const renderMessageContent = (msg: Message, isMe: boolean) => {
    if (msg.messageType === 'trade_proposal') {
      return <ReservationMessageCard msg={msg} isMe={isMe} />;
    }

    if (msg.messageType === 'trade_status') {
      const isAccepted = msg.payload?.action === 'accepted';
      return (
        <div className={`rounded-2xl border px-4 py-2.5 text-sm ${
          isAccepted
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {msg.content}
        </div>
      );
    }
  return (
    <div className={`px-4 py-2.5 rounded-2xl ${
      isMe
        ? 'bg-teal-600 text-white rounded-br-sm'
        : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-sm'
    }`}>
      <p style={{ fontSize: '0.875rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
        {msg.content}
      </p>
    </div>
  );
};

// Small presentational component to render the messages list
const MessagesList: React.FC<{
  messages: Message[];
  firstNewIdx: number;
  currentUser: any;
  otherUser: any;
  otherPresence: OtherPresence;
  messagesEndRef: React.RefObject<HTMLDivElement | null> | null;
}> = ({ messages, firstNewIdx, currentUser, otherUser, otherPresence, messagesEndRef }) => (
  <>
    {messages.map((msg, idx) => {
      const isMe = msg.senderId === currentUser.id;
      const showSep = idx === firstNewIdx && firstNewIdx > 0;
      return (
        <React.Fragment key={msg.id}>
          {showSep && <NewMessagesSeparator />}
          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {!isMe && (
              <img
                src={otherUser?.avatar}
                alt=""
                className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 flex-shrink-0"
              />
            )}
            <div
              className={isMe ? 'tc-msg-mine' : 'tc-msg-theirs'}
              style={{ maxWidth: msg.messageType === 'trade_proposal' || msg.messageType === 'trade_status' ? '88%' : '72%' }}
            >
                {renderMessageContent(msg, isMe)}
              <p className={`mt-1 ${isMe ? 'text-right text-slate-400' : 'text-slate-400'}`} style={{ fontSize: '0.65rem' }}>
                {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </React.Fragment>
      );
    })}

    {otherPresence.is_typing && (
      <TypingBubble avatar={otherUser.avatar} name={otherUser.name.split(' ')[0]} />
    )}

    <div ref={messagesEndRef} />
  </>
);

// ── Conversation list item ────────────────────────────────
const ConvItem: React.FC<{
  conv: Conversation;
  selected: boolean;
  otherTyping: boolean;
  onClick: () => void;
}> = ({ conv, selected, otherTyping, onClick }) => {
  const { currentUser, getUserById } = useApp();
  const otherId = conv.participants.find((p) => p !== currentUser?.id);
  const other = getUserById(otherId!);

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
  // Prevent overlapping presence polls
  const presencePollingRef = useRef(false);

  // Send button pulse
  const [sendPulse, setSendPulse] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversations = getUserConversations(currentUser?.id ?? '');

  // Handle incoming websocket messages for the selected conversation
  const handleWsMessage = useCallback((msg: any) => {
    if (!msg || msg?.type !== 'message') return;
    if (!selectedConvId) return;
    if (String(msg.conversation_id) !== String(selectedConvId)) return;

    const newMsg: Message = {
      id: String(msg.id),
      conversationId: String(msg.conversation_id),
      senderId: String(msg.sender_id),
      content: msg.content,
      timestamp: msg.timestamp,
      read: msg.read ?? false,
    };

    setMessages((prev) => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [selectedConvId]);

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

  // ── 2b. TYPING HEARTBEAT ──────────────────────────────
  // Mantiene el estado "escribiendo" refrescado mientras el usuario tiene texto.
  // El backend expira el typing después de 5 segundos, así que enviamos un
  // heartbeat cada 3 segundos mientras messageText.length > 0.
  useEffect(() => {
    if (!selectedConvId || messageText.length === 0) return;

    // Enviar typing heartbeat cada 3 segundos
    const typingHeartbeat = setInterval(() => {
      apiTypingUpdate(selectedConvId, true);
    }, 3000);

    return () => clearInterval(typingHeartbeat);
  }, [messageText, selectedConvId]);

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
      try { ws.subscribe(selectedConvId); } catch (e) { console.warn('Failed to subscribe to WS presence updates', e); }
    }

    // Polling para obtener presencia (se ejecuta siempre, como fallback para WS)
    const poll = async () => {
      if (presencePollingRef.current) return;
      presencePollingRef.current = true;
      try {
        const presence = await apiGetPresence(otherUserId, selectedConvId);
        setOtherPresence(presence);
      } catch (e) {
        // ignore poll errors
      } finally {
        presencePollingRef.current = false;
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    
    return () => {
      clearInterval(interval);
      if (ws) {
        try { ws.unsubscribe(selectedConvId); } catch (e) { console.warn('Failed to unsubscribe from WS presence updates', e); }
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
        ws.onMessage(handleWsMessage);
        return () => {
          try { ws.unsubscribe(selectedConvId); } catch (e) { console.warn('Failed to unsubscribe from WS messages', e); }
        };
      } catch (e) {
        console.warn('WebSocket not available - falling back to polling for messages', e);
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
    if (ws?.isConnected?.()) {
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
    const othId = c.participants.find((p) => p !== currentUser.id);
    const other = getUserById(othId!);
    return other?.name.toLowerCase().includes(search.toLowerCase());
  });

  const presenceLbl = presenceLabel(otherPresence.status);

  const sidebarVisibility = showSidebar ? 'flex' : 'hidden sm:flex';
  const mainVisibility = showSidebar ? 'hidden sm:flex' : 'flex';

  const renderMessagesArea = () => {
  if (loadingMsgs) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mb-3">
          <MessageCircle className="w-7 h-7 text-teal-400" />
        </div>
        <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>Inicia la conversación</p>
        <p className="text-slate-300 dark:text-slate-600 mt-1" style={{ fontSize: '0.8rem' }}>
          Di hola a {otherUser?.name.split(' ')[0]} 👋
        </p>
      </div>
    );
  }

  return (
    <MessagesList
      messages={messages}
      firstNewIdx={firstNewIdx}
      currentUser={currentUser}
      otherUser={otherUser}
      otherPresence={otherPresence}
      messagesEndRef={messagesEndRef}
    />
  );
};

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
        <div className={`w-full sm:w-72 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 flex flex-col ${sidebarVisibility}`}>
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
        <div className={`flex-1 flex flex-col min-w-0 ${mainVisibility}`}>
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
                        {(() => {
                          let otherDotClass = 'fill-slate-300 text-slate-300 dark:fill-slate-600 dark:text-slate-600';
                          if (otherPresence.status === 'online') otherDotClass = 'fill-green-500 text-green-500';
                          else if (otherPresence.status === 'away') otherDotClass = 'fill-amber-400 text-amber-400';
                          return <Circle className={`w-2 h-2 ${otherDotClass}`} />;
                        })()}
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
                {renderMessagesArea()}
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
