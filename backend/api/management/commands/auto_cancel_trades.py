from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from ...models import Trade
from ...serializers import create_trade_message


class Command(BaseCommand):
    help = 'Auto-cancel accepted trades that were not started by their auto_cancel_at deadline.'

    def handle(self, *args, **options):
        now = timezone.now()
        qs = Trade.objects.filter(
            status=Trade.Status.ACCEPTED,
            started_at__isnull=True,
            auto_cancel_at__isnull=False,
            auto_cancel_at__lte=now,
        )
        total = qs.count()
        if total == 0:
            self.stdout.write('No trades to auto-cancel.')
            return

        for trade in qs.select_related('service', 'offerer', 'requester'):
            trade.status = Trade.Status.CANCELLED
            trade.save(update_fields=['status'])

            # Create a trade status message (will broadcast via channels)
            try:
                sender = trade.offerer or trade.requester
                create_trade_message(
                    trade=trade,
                    sender=sender,
                    message_type='trade_status',
                    action='cancelled',
                    content='Intercambio cancelado automáticamente por inactividad',
                )
            except Exception as exc:
                self.stderr.write(
                    f"Failed to create trade status message for trade #{trade.id}: {exc}"
                )

            # Send email notification to participants if possible
            try:
                recipients = [u.email for u in (trade.offerer, trade.requester) if getattr(u, 'email', None)]
                if recipients:
                    frontend = getattr(settings, 'FRONTEND_URL', '').rstrip('/')
                    service_url = f"{frontend}/services/{trade.service.id}" if frontend else ''
                    subject = f"TimeCircle — Reserva cancelada para '{trade.service.title}'"
                    ctx = {'trade': trade, 'service': trade.service, 'service_url': service_url}
                    html_message = render_to_string('emails/trade_booking.html', ctx)
                    plain = strip_tags(html_message)
                    from django.core.mail import send_mail
                    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or settings.EMAIL_HOST_USER or 'no-reply@timecircle.app'
                    send_mail(subject, plain, from_email, recipients, html_message=html_message, fail_silently=True)
            except Exception:
                pass

            self.stdout.write(self.style.SUCCESS(f'Auto-cancelled trade #{trade.id}'))
