import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';

function formatRemaining(ms: number) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

const ActivityTimerBar: React.FC = () => {
  const app = useApp();
  const { trades, currentUser, requestEnd, confirmEnd, requestStart, confirmStart } = app;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Find an active trade involving current user
  const active = useMemo(() => {
    if (!currentUser) return null;
    return trades.find((tr) => {
      const isParticipant = tr.offererId === currentUser.id || tr.requesterId === currentUser.id;
      if (!isParticipant) return false;
      return tr.status === 'in_progress' || (tr.status === 'accepted' && tr.startedAt);
    }) || null;
  }, [trades, currentUser]);

  useEffect(() => {
    const handler = (e: any) => {
      // Could show toast here; for now we refresh trades via AppContext
      app.refreshTrades().catch(() => {});
    };
    globalThis.addEventListener('tc:trade:event', handler as EventListener);
    return () => globalThis.removeEventListener('tc:trade:event', handler as EventListener);
  }, [app]);

  if (!active) return null;

  const scheduled = active.scheduledDate ? new Date(active.scheduledDate).getTime() : null;
  const started = active.startedAt ? new Date(active.startedAt).getTime() : null;
  // Compute remaining display
  const label = active.status === 'in_progress' ? 'En curso' : 'Inicio solicitado';
  const remaining = scheduled ? (scheduled + (active.creditsAmount || 1) * 60 * 60 * 1000) - now : 0; // fallback: credits->hours

  const handleRequestEnd = async () => {
    await requestEnd(active.id).catch((e) => { console.error('requestEnd failed', e); });
  };

  const handleConfirmEnd = async () => {
    await confirmEnd(active.id).catch((e) => { console.error('confirmEnd failed', e); });
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-md flex items-center gap-4 max-w-3xl w-full">
        <div className="flex-1">
          <div className="text-sm text-slate-600">{label} · Servicio #{active.serviceId}</div>
          <div className="text-lg font-semibold text-slate-800">{active.notes || `Intercambio ${active.id}`}</div>
        </div>
        <div className="text-sm text-slate-700 text-center">
          <div className="font-mono text-lg">{formatRemaining(remaining)}</div>
          <div className="text-xs">{started ? 'Desde inicio' : 'Programado'}</div>
        </div>
        <div className="flex items-center gap-2">
          {active.status === 'in_progress' ? (
            // allow requesting/confirming end
            <>
              <button onClick={handleRequestEnd} className="px-3 py-1 bg-yellow-500 text-white rounded">Solicitar fin</button>
              <button onClick={handleConfirmEnd} className="px-3 py-1 bg-green-600 text-white rounded">Confirmar fin</button>
            </>
          ) : (
            // accepted + startedAt -> offer to confirm start if you are the other
            <>
              <button onClick={() => { requestStart(active.id).catch(()=>{}); }} className="px-3 py-1 bg-indigo-600 text-white rounded">Solicitar inicio</button>
              <button onClick={() => { confirmStart(active.id).catch(()=>{}); }} className="px-3 py-1 bg-green-600 text-white rounded">Confirmar inicio</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityTimerBar;
