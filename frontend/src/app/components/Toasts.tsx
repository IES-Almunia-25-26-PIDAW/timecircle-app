import React, { useEffect, useState, useCallback } from 'react';

type Toast = { id: string; message: string; level?: 'info' | 'success' | 'error' };

let idCounter = 0;

export const toastEventName = 'tc:toast';

export function pushToast(message: string, level: Toast['level'] = 'info') {
  const ev = new CustomEvent(toastEventName, { detail: { id: `t${++idCounter}`, message, level } });
  globalThis.dispatchEvent(ev);
}

const Toasts: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(x => x.id !== id)), []);

  useEffect(() => {
    const handler = (e: any) => {
      const t: Toast = e.detail;
      setToasts(prev => [...prev, t]);
      setTimeout(() => removeToast(t.id), 4500);
    };

    globalThis.addEventListener(toastEventName, handler as EventListener);
    return () => globalThis.removeEventListener(toastEventName, handler as EventListener);
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-60 flex flex-col gap-2">
      {toasts.map(t => {
        let levelClass = 'bg-slate-800 text-white';
        if (t.level === 'error') {
          levelClass = 'bg-red-600 text-white';
        } else if (t.level === 'success') {
          levelClass = 'bg-green-600 text-white';
        }

        return (
          <div key={t.id} className={`px-4 py-2 rounded-lg shadow-md max-w-sm ${levelClass}`}>
            {t.message}
          </div>
        );
      })}
    </div>
  );
};

export default Toasts;
