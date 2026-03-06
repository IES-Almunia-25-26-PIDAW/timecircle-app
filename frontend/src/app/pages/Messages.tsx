import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { MessageCircle, Send, Search, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Conversation } from '../data/mockData';

const ConversationItem: React.FC<{
  conv: Conversation;
  selected: boolean;
  onClick: () => void;
}> = ({ conv, selected, onClick }) => {
  const { currentUser, getUserById } = useApp();
  const otherId = conv.participants.find(p => p !== currentUser?.id)!;
  const other = getUserById(otherId);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
        selected ? 'bg-teal-50 border-r-2 border-teal-600' : 'hover:bg-slate-50'
      }`}
    >
      <div className="relative flex-shrink-0">
        <img src={other?.avatar} alt="" className="w-10 h-10 rounded-full border border-slate-200" />
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center" style={{ fontSize: '0.6rem' }}>
            {conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-slate-900 truncate" style={{ fontWeight: conv.unreadCount > 0 ? 600 : 400, fontSize: '0.875rem' }}>
            {other?.name}
          </span>
          <span className="text-slate-400 flex-shrink-0" style={{ fontSize: '0.7rem' }}>
            {new Date(conv.lastTimestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className={`truncate ${conv.unreadCount > 0 ? 'text-slate-700' : 'text-slate-400'}`} style={{ fontSize: '0.8rem' }}>
          {conv.lastMessage || 'Nueva conversación'}
        </p>
      </div>
    </button>
  );
};

export const Messages: React.FC = () => {
  const { currentUser, getUserConversations, getConversationMessages, sendMessage, markConversationRead, getUserById, startConversation } = useApp();
  const [searchParams] = useSearchParams();
  const initConv = searchParams.get('conv');
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initConv);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [showSidebar, setShowSidebar] = useState(!initConv);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initConv) {
      setSelectedConvId(initConv);
      setShowSidebar(false);
    }
  }, [initConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  });

  useEffect(() => {
    if (selectedConvId) {
      markConversationRead(selectedConvId);
    }
  }, [selectedConvId, markConversationRead]);

  if (!currentUser) return null;

  const conversations = getUserConversations(currentUser.id);
  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    const otherId = c.participants.find(p => p !== currentUser.id)!;
    const other = getUserById(otherId);
    return other?.name.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const messages = selectedConvId ? getConversationMessages(selectedConvId) : [];
  const otherUserId = selectedConv?.participants.find(p => p !== currentUser.id);
  const otherUser = otherUserId ? getUserById(otherUserId) : null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConvId) return;
    sendMessage(selectedConvId, messageText.trim());
    setMessageText('');
  };

  const selectConv = (convId: string) => {
    setSelectedConvId(convId);
    setShowSidebar(false);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      {/* Conversations list */}
      <div className={`
        w-full sm:w-72 flex-shrink-0 border-r border-slate-100 flex flex-col
        ${!showSidebar ? 'hidden sm:flex' : 'flex'}
      `}>
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-slate-900 mb-3" style={{ fontSize: '1rem', fontWeight: 700 }}>Mensajes</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversación..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
              style={{ fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConvs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 px-4">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p style={{ fontSize: '0.8rem' }}>No tienes mensajes aún</p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                selected={conv.id === selectedConvId}
                onClick={() => selectConv(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${showSidebar ? 'hidden sm:flex' : 'flex'}
      `}>
        {selectedConv && otherUser ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-white">
              <button
                onClick={() => setShowSidebar(true)}
                className="sm:hidden text-slate-500 hover:text-slate-700 mr-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <img src={otherUser.avatar} alt="" className="w-9 h-9 rounded-full border border-slate-200" />
              <div>
                <div className="text-slate-900" style={{ fontWeight: 600, fontSize: '0.9rem' }}>{otherUser.name}</div>
                <div className="text-slate-400" style={{ fontSize: '0.75rem' }}>⭐ {otherUser.rating} · {otherUser.completedTrades} intercambios</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-slate-400" style={{ fontSize: '0.875rem' }}>
                  Inicia la conversación
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <img src={otherUser.avatar} alt="" className="w-7 h-7 rounded-full border border-slate-200 mr-2 flex-shrink-0 self-end" />
                    )}
                    <div className={`
                      max-w-xs sm:max-w-sm lg:max-w-md px-4 py-2.5 rounded-2xl
                      ${isMe ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-900 rounded-bl-sm'}
                    `}>
                      <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{msg.content}</p>
                      <p className={`mt-1 ${isMe ? 'text-teal-200' : 'text-slate-400'}`} style={{ fontSize: '0.65rem' }}>
                        {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex gap-3">
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder={`Escribe a ${otherUser.name}...`}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                style={{ fontSize: '0.875rem' }}
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="flex-shrink-0 w-10 h-10 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageCircle className="w-16 h-16 mb-3 opacity-20" />
            <p style={{ fontSize: '1rem' }}>Selecciona una conversación</p>
            <p style={{ fontSize: '0.875rem' }}>o empieza una desde el perfil de un vecino</p>
          </div>
        )}
      </div>
    </div>
  );
};
