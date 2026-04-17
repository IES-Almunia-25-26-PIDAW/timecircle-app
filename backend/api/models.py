from django.db import models
from django.db.models import Q, Avg
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import AbstractUser
import decimal


# ─────────────────────────────────────────────
#  USER
# ─────────────────────────────────────────────

class User(AbstractUser):
    """
    Usuario de TimeCircle.
    Extiende AbstractUser añadiendo los campos del banco de tiempo.
    Los créditos horarios se transfieren automáticamente al completar un Trade.

    Economía de onboarding (créditos iniciales = 0):
      +0.5 cr  →  al crear la primera habilidad (skill)
      +0.5 cr  →  al publicar el primer servicio
      +1.0 cr  →  al completar el primer intercambio como proveedor (offerer)
    """

    class Badge(models.TextChoices):
        GOLD   = 'gold',   _('Oro')
        SILVER = 'silver', _('Plata')
        BRONZE = 'bronze', _('Bronce')

    # ── Perfil ──────────────────────────────
    avatar   = models.URLField(max_length=500, blank=True, default='')
    bio      = models.TextField(max_length=500, blank=True, default='')
    location = models.CharField(max_length=100, blank=True, default='')

    # ── Economía de créditos ─────────────────
    # DecimalField con 1 decimal para soportar bonos de 0,5 cr.
    # Los nuevos usuarios empiezan con 0 créditos y los ganan completando
    # acciones de onboarding.
    credits        = models.DecimalField(
        max_digits=8,
        decimal_places=1,
        default=decimal.Decimal('0.0'),
    )
    hours_given    = models.PositiveIntegerField(default=0)
    hours_received = models.PositiveIntegerField(default=0)

    # ── Estadísticas cacheadas ──────────────
    rating           = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews    = models.PositiveIntegerField(default=0)
    completed_trades = models.PositiveIntegerField(default=0)
    badge            = models.CharField(max_length=10, choices=Badge.choices, blank=True, null=True)

    class Meta:
        db_table = 'user_account'
        verbose_name = _('Usuario')
        verbose_name_plural = _('Usuarios')

    def __str__(self):
        return f'{self.get_full_name() or self.username} <{self.email}>'

    def update_badge(self):
        """Recalcula y persiste la insignia según trades completados."""
        if self.completed_trades >= 50:
            self.badge = self.Badge.GOLD
        elif self.completed_trades >= 20:
            self.badge = self.Badge.SILVER
        elif self.completed_trades >= 5:
            self.badge = self.Badge.BRONZE
        else:
            self.badge = None
        self.save(update_fields=['badge'])

    def update_rating(self):
        """Recalcula rating y total_reviews a partir de las reseñas recibidas."""
        result = self.received_reviews.aggregate(avg=Avg('rating'))
        self.rating        = result['avg'] or 0.00
        self.total_reviews = self.received_reviews.count()
        self.save(update_fields=['rating', 'total_reviews'])

    def award_onboarding_bonus(self, bonus: decimal.Decimal, reason: str) -> None:
        """
        Otorga un bono de créditos de onboarding y lo persiste.
        Uso interno; llamar desde views o serializers tras verificar
        que la condición de primera vez se cumple.
        """
        self.refresh_from_db(fields=['credits'])
        self.credits += bonus
        self.save(update_fields=['credits'])


# ─────────────────────────────────────────────
#  CATEGORÍAS Y ETIQUETAS
# ─────────────────────────────────────────────

class Category(models.Model):
    name        = models.CharField(max_length=50, unique=True)
    description = models.TextField(max_length=200, blank=True)
    icon        = models.CharField(max_length=50, blank=True, default='',
                                   help_text=_('Nombre del icono de lucide-react'))

    class Meta:
        db_table = 'category'
        verbose_name = _('Categoría')
        verbose_name_plural = _('Categorías')

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'tag'
        verbose_name = _('Etiqueta')
        verbose_name_plural = _('Etiquetas')

    def __str__(self):
        return self.name


# ─────────────────────────────────────────────
#  HABILIDADES
# ─────────────────────────────────────────────

class Skill(models.Model):
    name        = models.CharField(max_length=30, unique=True)
    description = models.TextField(max_length=200, blank=True)

    class Meta:
        db_table = 'skill'
        verbose_name = _('Habilidad')
        verbose_name_plural = _('Habilidades')

    def __str__(self):
        return self.name


class UserSkill(models.Model):
    user  = models.ForeignKey(User,  on_delete=models.CASCADE, related_name='user_skills')
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name='user_skills')

    class Meta:
        db_table = 'user_skill'
        unique_together = ('user', 'skill')
        verbose_name = _('Habilidad de usuario')
        verbose_name_plural = _('Habilidades de usuarios')

    def __str__(self):
        return f'{self.user.username} → {self.skill.name}'


# ─────────────────────────────────────────────
#  SERVICIOS
# ─────────────────────────────────────────────

class Service(models.Model):
    class Type(models.TextChoices):
        OFFER   = 'offer',   _('Oferta')
        REQUEST = 'request', _('Solicitud')

    class Status(models.TextChoices):
        ACTIVE    = 'active',    _('Activo')
        PAUSED    = 'paused',    _('Pausado')
        COMPLETED = 'completed', _('Completado')

    user        = models.ForeignKey(User,     on_delete=models.CASCADE,  related_name='services')
    type        = models.CharField(max_length=10, choices=Type.choices,   default=Type.OFFER)
    title       = models.CharField(max_length=70)
    description = models.TextField(max_length=500, blank=True)
    category    = models.ForeignKey(Category, on_delete=models.SET_NULL,  null=True, related_name='services')
    duration    = models.PositiveIntegerField(help_text=_('Duración en minutos'))
    credits     = models.PositiveIntegerField(default=1, help_text=_('Créditos horarios solicitados'))
    status      = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    created_at  = models.DateTimeField(auto_now_add=True)
    tags        = models.ManyToManyField(Tag, related_name='services', blank=True)

    class Meta:
        db_table = 'service'
        ordering = ['-created_at']
        verbose_name = _('Servicio')
        verbose_name_plural = _('Servicios')

    def __str__(self):
        return f'[{self.get_type_display()}] {self.title}'


# ─────────────────────────────────────────────
#  INTERCAMBIOS (TRADES)
# ─────────────────────────────────────────────

class Trade(models.Model):
    class Status(models.TextChoices):
        PENDING     = 'pending',     _('Pendiente')
        ACCEPTED    = 'accepted',    _('Aceptado')
        IN_PROGRESS = 'in_progress', _('En Curso')
        COMPLETED   = 'completed',   _('Completado')
        CANCELLED   = 'cancelled',   _('Cancelado')

    service        = models.ForeignKey(Service, on_delete=models.PROTECT, related_name='trades')
    offerer        = models.ForeignKey(User,    on_delete=models.PROTECT, related_name='trades_as_offerer')
    requester      = models.ForeignKey(User,    on_delete=models.PROTECT, related_name='trades_as_requester')
    status         = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    scheduled_date = models.DateTimeField()
    credits_amount = models.PositiveIntegerField()
    notes          = models.TextField(max_length=500, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    completed_at   = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'trade'
        ordering = ['-created_at']
        verbose_name = _('Intercambio')
        verbose_name_plural = _('Intercambios')

    def __str__(self):
        return f'Trade #{self.pk} · {self.get_status_display()}'


# ─────────────────────────────────────────────
#  TRANSACCIONES DE CRÉDITOS
# ─────────────────────────────────────────────

class Transaction(models.Model):
    class Type(models.TextChoices):
        DEBIT   = 'debit',   _('Débito')
        CREDIT  = 'credit',  _('Crédito')
        BONUS   = 'bonus',   _('Bono de onboarding')

    user             = models.ForeignKey(User,  on_delete=models.CASCADE, related_name='transactions')
    trade            = models.ForeignKey(Trade, on_delete=models.CASCADE, related_name='transactions',
                                         null=True, blank=True)
    amount           = models.DecimalField(
        max_digits=8,
        decimal_places=1,
        help_text=_('Positivo = crédito recibido / Negativo = crédito pagado'),
    )
    transaction_type = models.CharField(max_length=10, choices=Type.choices)
    description      = models.CharField(max_length=200, blank=True, default='')
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transaction'
        ordering = ['-created_at']
        verbose_name = _('Transacción')
        verbose_name_plural = _('Transacciones')

    def __str__(self):
        trade_ref = f'Trade #{self.trade_id}' if self.trade_id else 'Bono'
        return f'{self.user.username} · {self.amount:+} créditos · {trade_ref}'


# ─────────────────────────────────────────────
#  MENSAJERÍA
# ─────────────────────────────────────────────

class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conversation'
        ordering = ['-updated_at']
        verbose_name = _('Conversación')
        verbose_name_plural = _('Conversaciones')

    def __str__(self):
        names = ', '.join(p.username for p in self.participants.all()[:3])
        return f'Conversación #{self.pk} [{names}]'


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender       = models.ForeignKey(User,         on_delete=models.CASCADE, related_name='sent_messages')
    content      = models.TextField(max_length=1000)
    timestamp    = models.DateTimeField(auto_now_add=True)
    read         = models.BooleanField(default=False)

    class Meta:
        db_table = 'message'
        ordering = ['timestamp']
        verbose_name = _('Mensaje')
        verbose_name_plural = _('Mensajes')

    def __str__(self):
        return f'{self.sender.username}: {self.content[:40]}'


# ─────────────────────────────────────────────
#  RESEÑAS / VALORACIONES
# ─────────────────────────────────────────────

class Review(models.Model):
    trade      = models.ForeignKey(Trade, on_delete=models.CASCADE, related_name='reviews')
    reviewer   = models.ForeignKey(User,  on_delete=models.CASCADE, related_name='given_reviews')
    reviewee   = models.ForeignKey(User,  on_delete=models.CASCADE, related_name='received_reviews')
    rating     = models.SmallIntegerField(help_text=_('Valoración de 1 a 5'))
    comment    = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review'
        unique_together = ('trade', 'reviewer')
        ordering = ['-created_at']
        verbose_name = _('Reseña')
        verbose_name_plural = _('Reseñas')
        constraints = [
            models.CheckConstraint(
                condition=Q(rating__range=(1, 5)),
                name='rating_range_1_to_5'
            )
        ]

    def __str__(self):
        return f'{self.reviewer.username} → {self.reviewee.username} · {self.rating}★'


# ─────────────────────────────────────────────
#  MENSAJES DE CONTACTO
# ─────────────────────────────────────────────

class ContactMessage(models.Model):
    """
    Mensaje enviado a través del formulario de contacto público.
    No requiere autenticación para su creación.
    """

    class Reason(models.TextChoices):
        SUPPORT    = 'soporte',    _('Soporte técnico')
        LEGAL      = 'legal',      _('Consulta legal')
        REPORT     = 'reporte',    _('Reportar usuario')
        SUGGESTION = 'sugerencia', _('Sugerencia')
        OTHER      = 'otro',       _('Otro motivo')

    name       = models.CharField(max_length=150)
    email      = models.EmailField()
    reason     = models.CharField(max_length=20, choices=Reason.choices)
    message    = models.TextField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)
    read       = models.BooleanField(default=False)

    class Meta:
        db_table = 'contact_message'
        ordering = ['-created_at']
        verbose_name = _('Mensaje de contacto')
        verbose_name_plural = _('Mensajes de contacto')

    def __str__(self):
        return f'[{self.get_reason_display()}] {self.name} <{self.email}>'