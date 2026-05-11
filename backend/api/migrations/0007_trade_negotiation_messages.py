from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_user_exact_address_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='trade',
            name='last_proposed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='trade',
            name='last_proposed_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='trade_proposals_made',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='message',
            name='message_type',
            field=models.CharField(
                choices=[
                    ('text', 'Texto'),
                    ('trade_proposal', 'Propuesta de intercambio'),
                    ('trade_status', 'Estado de intercambio'),
                ],
                default='text',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='message',
            name='payload',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='message',
            name='trade',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='messages',
                to='api.trade',
            ),
        ),
    ]
