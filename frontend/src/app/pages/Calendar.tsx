import React, { useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import '../../styles/fullcalendar.css';
import { useApp } from '../context/AppContext';

export const Calendar: React.FC = () => {
  const { currentUser, getUserTrades, getServiceById, getUserById, startConversation } = useApp();
  const navigate = useNavigate();
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const trades = currentUser ? getUserTrades(currentUser.id) : [];

  const events = useMemo(() => trades.map((t) => {
    const service = getServiceById(t.serviceId);
    const otherUserId = t.offererId === currentUser?.id ? t.requesterId : t.offererId;
    const otherUser = getUserById(otherUserId || '');
    const titleParts: string[] = [];
    if (service?.title) titleParts.push(service.title);
    if (otherUser?.name) titleParts.push(`con ${otherUser.name}`);
    const title = titleParts.join(' — ') || 'Cita';

    const startDate = t.scheduledDate ? new Date(t.scheduledDate) : new Date(t.createdAt || Date.now());
    const endDate = new Date(startDate.getTime() + (Number(service?.duration || 0) * 60000));

    return {
      id: t.id,
      title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      allDay: false,
      extendedProps: {
        serviceId: t.serviceId,
        conversationId: t.conversationId,
        otherUserId,
        status: t.status,
      },
    };
  }), [trades, getServiceById, getUserById, currentUser]);

  const handleEventClick = async (info: any) => {
    const { event } = info;
    const convId = event.extendedProps?.conversationId;
    const serviceId = event.extendedProps?.serviceId;
    const otherUserId = event.extendedProps?.otherUserId;

    if (convId) {
      navigate(`/messages?conv=${convId}`);
      return;
    }

    if (otherUserId && startConversation) {
      const newConvId = await startConversation(otherUserId);
      if (newConvId) {
        navigate(`/messages?conv=${newConvId}`);
        return;
      }
    }

    if (serviceId) navigate(`/services/${serviceId}`);
  };

  useEffect(() => {
    const el = document.createElement('div');
    el.className = 'fc-event-tooltip';
    el.style.position = 'absolute';
    el.style.display = 'none';
    document.body.appendChild(el);
    tooltipRef.current = el;
    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
        tooltipRef.current = null;
      }
    };
  }, []);

  const handleEventMouseEnter = (info: any) => {
    const { event, jsEvent } = info;
    const start = event.start ? new Date(event.start) : null;
    const end = event.end ? new Date(event.end) : null;
    let time = '';
    if (start) {
      const startStr = start.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
      const endStr = end ? ` — ${end.toLocaleTimeString([], { timeStyle: 'short' })}` : '';
      time = `${startStr}${endStr}`;
    }

    if (tooltipRef.current) {
      tooltipRef.current.innerHTML = `
        <div class="title">${event.title}</div>
        <div class="meta">${time}</div>
        ${event.extendedProps?.status ? `<div class="meta">Estado: ${event.extendedProps.status}</div>` : ''}
      `;
      tooltipRef.current.style.left = `${jsEvent.clientX}px`;
      tooltipRef.current.style.top = `${jsEvent.clientY}px`;
      tooltipRef.current.style.display = 'block';
    }
  };

  const handleEventMouseMove = (info: any) => {
    const { jsEvent } = info;
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${jsEvent.clientX}px`;
      tooltipRef.current.style.top = `${jsEvent.clientY}px`;
    }
  };

  const handleEventMouseLeave = () => {
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  };

  if (!currentUser) {
    return (
      <div className="text-center py-12 text-slate-500">Inicia sesión para ver tu calendario.</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Calendario</h2>
        </div>

        <div className="h-auto md:h-[700px] relative">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
            locales={[esLocale]}
            locale="es"
            events={events}
            eventClick={handleEventClick}
            eventMouseEnter={handleEventMouseEnter}
            eventMouseMove={handleEventMouseMove}
            eventMouseLeave={handleEventMouseLeave}
            height="100%"
            dayMaxEventRows={3}
            nowIndicator
          />
        </div>
      </div>
    </div>
  );
};

export default Calendar;
