import React, { useEffect, useState, useCallback } from 'react';

type Toast = { id: string; message: string; level?: 'info' | 'success' | 'error'; meta?: Record<string, any> };

let idCounter = 0;

export const toastEventName = 'tc:toast';

export function pushToast(message: string, level: Toast['level'] = 'info', meta?: Record<string, any>) {
  const ev = new CustomEvent(toastEventName, { detail: { id: `t${++idCounter}`, message, level, meta } });
  globalThis.dispatchEvent(ev);
}

const Toasts: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenSignaturesRef = React.useRef<Set<string>>(new Set());
  const idToSignatureRef = React.useRef<Map<string, string>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => {
      const t = prev.find(x => x.id === id);
      if (t) {
        const sig = idToSignatureRef.current.get(id);
        if (sig) {
          try { seenSignaturesRef.current.delete(sig); } catch (e) {}
          idToSignatureRef.current.delete(id);
        }
      }
      return prev.filter(x => x.id !== id);
    });
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      const t: Toast = e.detail;
      const meta = t.meta || {};
      const mid = meta?.messageId ? String(meta.messageId) : '';
      const signature = mid
        ? `mid:${mid}`
        : `conv:${String(meta.conversationId || '')}|sender:${String(meta.senderName || '')}|msg:${String(t.message || '')}|ts:${String(meta.timestamp || '')}`;

      if (seenSignaturesRef.current.has(signature)) return;
      seenSignaturesRef.current.add(signature);
      idToSignatureRef.current.set(t.id, signature);

      setToasts(prev => [...prev, t]);
      setTimeout(() => removeToast(t.id), 4500);
    };

    globalThis.addEventListener(toastEventName, handler as EventListener);
    return () => globalThis.removeEventListener(toastEventName, handler as EventListener);
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-60 flex flex-col gap-3">
      {toasts.map(t => {
        const levelClassBase = t.level === 'error' ? 'bg-red-600' : t.level === 'success' ? 'bg-green-600' : 'bg-slate-800';
        const textColor = 'text-white';

        const onClick = () => {
          try {
            const convId = (t as any).meta?.conversationId;
            if (convId) globalThis.dispatchEvent(new CustomEvent('tc:openConversation', { detail: { conversationId: convId } }));
          } catch (e) {
            // ignore
          }
        };

        const senderName = (t.meta?.senderName || '').toString();
        const senderAvatar = (t.meta?.senderAvatar || '').toString();

        return (
          <div key={t.id} onClick={onClick} className="max-w-sm cursor-pointer">
            <div className={`flex items-start gap-3 px-3 py-2 rounded-lg shadow-md ${levelClassBase} ${textColor}`}>
              <div className="flex-shrink-0">
                <img
                  src={senderAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(senderName || t.message)}`}
                  alt={senderName || 'avatar'}
                  className="w-10 h-10 rounded-full object-cover border border-white/20"
                />
              </div>
              <div className="min-w-0 flex-1">
                {senderName ? (
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">{senderName}</div>
                  </div>
                ) : null}
                <div className={`mt-1 text-sm leading-tight break-words ${levelClassBase} ${textColor}`}>{t.message}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Toasts;
