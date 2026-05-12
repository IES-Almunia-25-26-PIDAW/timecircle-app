import decimal
import math
from typing import Optional
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone

from .models import (
    User, Category, Tag, Skill, UserSkill, Service, Trade,
    Transaction, Conversation, Message, Review, ContactMessage, PasswordResetCode
)



# ══════════════════════════════════════════════════════════
#  HABILIDADES  /  TAGS  /  CATEGORÍAS
# ══════════════════════════════════════════════════════════

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Skill
        fields = ['id', 'name', 'description']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tag
        fields = ['id', 'name']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'name', 'description', 'icon']

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer de solo-escritura para el registro de nuevos usuarios."""

    password  = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label='Confirmar contraseña')

    class Meta:
        model  = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password2', 'location', 'bio',
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name':  {'required': True},
            'email':      {'required': True},
        }

    # ── Validaciones ────────────────────────

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este correo electrónico.')
        return value.lower()

    def validate_username(self, value: str) -> str:
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Este nombre de usuario ya está en uso.')
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Las contraseñas no coinciden.'})
        return attrs

    def create(self, validated_data: dict) -> User:
        user = User.objects.create_user(credits=decimal.Decimal('0.0'), **validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer de lectura con todos los campos públicos del usuario."""

    name         = serializers.SerializerMethodField()
    avatar       = serializers.SerializerMethodField()
    skills       = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source='date_joined', read_only=True)
    is_admin     = serializers.BooleanField(source='is_staff', read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'name', 'first_name', 'last_name',
            'avatar', 'bio', 'location', 'city', 'country',
            'latitude', 'longitude',
            # exact address fields: may be omitted from public responses depending on user preference
            'street_address', 'postal_code', 'share_exact_location',
            'credits', 'rating', 'total_reviews',
            'member_since', 'skills', 'badge',
            'completed_trades', 'is_admin',
            'hours_given', 'hours_received',
        ]
        read_only_fields = [
            'credits', 'rating', 'total_reviews',
            'completed_trades', 'hours_given', 'hours_received', 'badge',
        ]

    def get_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.username

    def get_avatar(self, obj: User) -> str:
        # Prefer uploaded image if present, fall back to stored URL
        try:
            if getattr(obj, 'avatar_image', None):
                if obj.avatar_image and hasattr(obj.avatar_image, 'url'):
                    return obj.avatar_image.url
        except Exception:
            pass
        return obj.avatar or ''

    def get_skills(self, obj: User) -> list[str]:
        return list(
            obj.user_skills.select_related('skill').values_list('skill__name', flat=True)
        )

    def to_representation(self, instance: User) -> dict:
        """Hide exact address fields from public responses unless the requester
        is the owner, a staff user, or the owner has opted to share exact location.
        """
        data = super().to_representation(instance)
        request = self.context.get('request')
        show_exact = False
        if request is not None and hasattr(request, 'user'):
            try:
                if request.user.is_authenticated:
                    if request.user.is_staff or request.user == instance:
                        show_exact = True
            except Exception:
                # Defensive: if request.user comparisons fail, fall back
                show_exact = False
        # If the user themselves has opted in to share exact location, allow it
        if getattr(instance, 'share_exact_location', False):
            show_exact = True

        if not show_exact:
            data.pop('street_address', None)
            data.pop('postal_code', None)
            data.pop('latitude', None)
            data.pop('longitude', None)

        return data


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para que el propio usuario edite su perfil."""

    class Meta:
        model  = User
        fields = [
            'first_name', 'last_name', 'avatar', 'bio', 'location',
            'avatar_image',
            'city', 'country', 'latitude', 'longitude',
            'street_address', 'postal_code', 'share_exact_location',
            'search_radius_km', 'search_my_city_only',
            'max_trade_distance_km', 'trade_my_city_only',
        ]

    avatar_image = serializers.ImageField(required=False, allow_null=True)

    def validate_avatar_image(self, value):
        if value is None:
            return None
        max_size = 5 * 1024 * 1024  # 5 MB
        if getattr(value, 'size', 0) > max_size:
            raise serializers.ValidationError('El archivo es demasiado grande (máx. 5 MB).')
        content_type = getattr(value, 'content_type', '')
        allowed = ('image/png', 'image/jpeg', 'image/webp')
        if content_type and content_type not in allowed:
            raise serializers.ValidationError('Formato de imagen no soportado. Usa PNG/JPEG/WEBP.')
        return value
    def validate_avatar(self, value: str) -> str:
        if value and not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError('El avatar debe ser una URL válida (http/https).')
        return value

    def validate_first_name(self, value: str) -> str:
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError('El nombre debe tener al menos 2 caracteres.')
        return value.strip()

    def validate_last_name(self, value: str) -> str:
        if value and len(value.strip()) < 2:
            raise serializers.ValidationError('El apellido debe tener al menos 2 caracteres.')
        return value.strip()

    def validate_latitude(self, value: Optional[float]) -> Optional[float]:
        if value is None:
            return None
        if not (-90 <= float(value) <= 90):
            raise serializers.ValidationError('Latitud fuera de rango (-90..90).')
        return value

    def validate_longitude(self, value: Optional[float]) -> Optional[float]:
        if value is None:
            return None
        if not (-180 <= float(value) <= 180):
            raise serializers.ValidationError('Longitud fuera de rango (-180..180).')
        return value

    def validate_postal_code(self, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        val = str(value).strip()
        if len(val) > 20:
            raise serializers.ValidationError('El código postal es demasiado largo.')
        return val

    def update(self, instance: User, validated_data: dict) -> User:
        # Handle avatar_image specially: allow upload or explicit removal (null)
        avatar_provided = 'avatar_image' in validated_data
        avatar_value = validated_data.pop('avatar_image', serializers.empty)

        # If avatar_image explicitly provided as None -> remove existing image
        if avatar_provided and avatar_value is None:
            try:
                instance.avatar_image.delete(save=False)
            except Exception:
                pass
            instance.avatar_image = None

        # If avatar_image is a file, assign it
        elif avatar_provided and avatar_value is not serializers.empty and avatar_value is not None:
            instance.avatar_image = avatar_value

        # If avatar URL provided as empty string, clear it
        if 'avatar' in validated_data and validated_data['avatar'] == '':
            instance.avatar = ''

        # Update remaining fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class MeSerializer(serializers.ModelSerializer):
    """Serializer para el propio usuario: incluye campos de ubicación y preferencias."""

    name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source='date_joined', read_only=True)
    skills = serializers.SerializerMethodField()
    is_admin = serializers.BooleanField(source='is_staff', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'name', 'first_name', 'last_name',
            'avatar', 'bio', 'location', 'city', 'country',
            'latitude', 'longitude',
            'street_address', 'postal_code', 'share_exact_location',
            'search_radius_km', 'search_my_city_only',
            'max_trade_distance_km', 'trade_my_city_only',
            'credits', 'rating', 'total_reviews',
            'member_since', 'skills', 'badge',
            'completed_trades', 'is_admin',
            'hours_given', 'hours_received',
        ]
        read_only_fields = ['credits', 'rating', 'total_reviews', 'completed_trades', 'hours_given', 'hours_received', 'badge']

    def get_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.username

    def get_skills(self, obj: User) -> list[str]:
        return list(obj.user_skills.select_related('skill').values_list('skill__name', flat=True))

    def get_avatar(self, obj: User) -> str:
        try:
            if getattr(obj, 'avatar_image', None):
                if obj.avatar_image and hasattr(obj.avatar_image, 'url'):
                    return obj.avatar_image.url
        except Exception:
            pass
        return obj.avatar or ''


class UserRankingSerializer(serializers.ModelSerializer):
    """Serializer optimizado para el ranking público de usuarios."""

    name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'name', 'avatar', 'rating',
            'completed_trades', 'hours_given', 'badge', 'location',
        ]

    def get_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.username


class UserSkillSerializer(serializers.ModelSerializer):
    skill    = SkillSerializer(read_only=True)
    skill_id = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(), source='skill', write_only=True
    )

    class Meta:
        model  = UserSkill
        fields = ['id', 'skill', 'skill_id']

class ServiceSerializer(serializers.ModelSerializer):
    user        = UserSerializer(read_only=True)
    category    = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True,
        label='Categoría'
    )
    tags    = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), many=True, source='tags',
        write_only=True, required=False, label='Etiquetas'
    )
    distance_km = serializers.SerializerMethodField()
    proximity = serializers.SerializerMethodField()

    class Meta:
        model  = Service
        fields = [
            'id', 'user',
            'type', 'title', 'description',
            'category', 'category_id',
            'duration', 'credits', 'status',
            'created_at', 'tags', 'tag_ids',
            # Derived location helpers (optional; computed if viewer coords provided)
            'distance_km', 'proximity',
        ]
        read_only_fields = ['user', 'created_at']

    # ── Validaciones de campos ───────────────

    def validate_duration(self, value: int) -> int:
        if value < 15:
            raise serializers.ValidationError('La duración mínima es 15 minutos.')
        if value > 480:
            raise serializers.ValidationError('La duración máxima es 480 minutos (8 horas).')
        return value

    def validate_credits(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError('El mínimo de créditos es 1.')
        if value > 20:
            raise serializers.ValidationError('El máximo de créditos es 20.')
        return value

    def validate_title(self, value: str) -> str:
        if len(value.strip()) < 5:
            raise serializers.ValidationError('El título debe tener al menos 5 caracteres.')
        return value.strip()

    # ── Create / Update con M2M ──────────────

    def create(self, validated_data: dict) -> Service:
        tags = validated_data.pop('tags', [])
        service = Service.objects.create(**validated_data)
        service.tags.set(tags)
        return service

    def update(self, instance: Service, validated_data: dict) -> Service:
        tags = validated_data.pop('tags', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tags is not None:
            instance.tags.set(tags)
        return instance

    # ── Location helpers ─────────────────────────────────
    def _get_viewer_coords(self) -> tuple[Optional[float], Optional[float]]:
        req = self.context.get('request')
        if not req:
            return None, None
        try:
            lat = req.query_params.get('viewer_lat')
            lon = req.query_params.get('viewer_lon')
            if lat is None or lon is None:
                return None, None
            return float(lat), float(lon)
        except Exception:
            return None, None

    def _haversine_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        # Haversine formula
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    def get_distance_km(self, obj: Service) -> Optional[float]:
        vlat, vlon = self._get_viewer_coords()
        if vlat is None or vlon is None:
            return None
        u = obj.user
        if u.latitude is None or u.longitude is None:
            return None
        try:
            return round(self._haversine_km(vlat, vlon, float(u.latitude), float(u.longitude)), 2)
        except Exception:
            return None

    def get_proximity(self, obj: Service) -> Optional[str]:
        d = self.get_distance_km(obj)
        if d is None:
            return None
        if d <= 0.8:
            return 'very_close'
        if d <= 3.0:
            return 'close'
        if d <= 15.0:
            return 'medium'
        return 'far'

    # Note: approx_zone removed — UI will use profile-stored location when allowed.


# ══════════════════════════════════════════════════════════
#  INTERCAMBIOS (TRADES)
# ══════════════════════════════════════════════════════════

class ReviewSummarySerializer(serializers.ModelSerializer):
    """Serializer ligero de reseñas para incrustar en Trade."""
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model  = Review
        fields = ['id', 'reviewer_name', 'rating', 'comment', 'created_at']

    def get_reviewer_name(self, obj: Review) -> str:
        return obj.reviewer.get_full_name() or obj.reviewer.username


def get_or_create_trade_conversation(trade: Trade) -> Conversation:
    participant_ids = sorted([trade.offerer_id, trade.requester_id])
    for conv in Conversation.objects.prefetch_related('participants'):
        if sorted(conv.participants.values_list('id', flat=True)) == participant_ids:
            return conv

    conversation = Conversation.objects.create()
    conversation.participants.set([trade.offerer, trade.requester])
    return conversation


def build_trade_message_payload(trade: Trade, action: str, message: str = '') -> dict:
    service = trade.service
    return {
        'action': action,
        'trade_id': trade.id,
        'status': trade.status,
        'service': {
            'id': service.id,
            'title': service.title,
            'type': service.type,
            'duration': service.duration,
            'credits': service.credits,
        },
        'offerer_id': trade.offerer_id,
        'requester_id': trade.requester_id,
        'scheduled_date': trade.scheduled_date.isoformat() if trade.scheduled_date else None,
        'credits_amount': trade.credits_amount,
        'notes': trade.notes,
        'message': message,
        'last_proposed_by': trade.last_proposed_by_id,
        'last_proposed_at': trade.last_proposed_at.isoformat() if trade.last_proposed_at else None,
    }


def create_trade_message(
    trade: Trade,
    sender: User,
    message_type: str,
    action: str,
    content: str,
    message: str = '',
) -> Message:
    conversation = get_or_create_trade_conversation(trade)
    msg = Message.objects.create(
        conversation=conversation,
        sender=sender,
        content=content,
        message_type=message_type,
        trade=trade,
        payload=build_trade_message_payload(trade, action, message),
    )
    conversation.save()
    return msg


class TradeSerializer(serializers.ModelSerializer):
    """Serializer de lectura completo de un Trade."""
    service   = ServiceSerializer(read_only=True)
    offerer   = UserSerializer(read_only=True)
    requester = UserSerializer(read_only=True)
    reviews   = ReviewSummarySerializer(many=True, read_only=True)
    last_proposed_by = UserSerializer(read_only=True)
    conversation_id = serializers.SerializerMethodField()

    class Meta:
        model  = Trade
        fields = [
            'id', 'service', 'offerer', 'requester',
            'status', 'scheduled_date', 'credits_amount',
            'notes', 'last_proposed_by', 'last_proposed_at',
            'conversation_id', 'created_at', 'completed_at', 'reviews',
        ]
        read_only_fields = [
            'offerer', 'requester', 'last_proposed_by', 'last_proposed_at',
            'created_at', 'completed_at',
        ]

    def get_conversation_id(self, obj: Trade) -> int | None:
        ids = [obj.offerer_id, obj.requester_id]
        for conv in Conversation.objects.prefetch_related('participants'):
            if sorted(conv.participants.values_list('id', flat=True)) == sorted(ids):
                return conv.id
        return None


class TradeCreateSerializer(serializers.ModelSerializer):
    """Serializer de escritura para crear una solicitud de intercambio."""
    service_id = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(status='active'),
        source='service', label='Servicio'
    )

    class Meta:
        model  = Trade
        fields = ['service_id', 'scheduled_date', 'credits_amount', 'notes']

    def validate_scheduled_date(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError('La fecha programada debe ser en el futuro.')
        return value

    def validate(self, attrs: dict) -> dict:
        service   = attrs['service']
        requester = self.context['request'].user

        # No se puede intercambiar un servicio propio
        if service.user == requester:
            raise serializers.ValidationError(
                'No puedes solicitar tu propio servicio.'
            )

        credits_amount = attrs.get('credits_amount')
        if credits_amount is None or credits_amount < 1:
            raise serializers.ValidationError({
                'credits_amount': 'El monto de créditos debe ser al menos 1.'
            })
        if credits_amount > 20:
            raise serializers.ValidationError({
                'credits_amount': 'El monto de créditos no puede superar 20.'
            })

        # El solicitante debe tener saldo suficiente (si solicita una oferta)
        if service.type == Service.Type.OFFER:
            if requester.credits < credits_amount:
                raise serializers.ValidationError(
                    f'No tienes créditos suficientes. Saldo actual: {requester.credits}, '
                    f'requeridos: {credits_amount}.'
                )

        # Evitar duplicados de trade activos para el mismo servicio
        active_statuses = ['pending', 'accepted', 'in_progress']
        duplicate = Trade.objects.filter(
            service=service, requester=requester, status__in=active_statuses
        ).exists()
        if duplicate:
            raise serializers.ValidationError(
                'Ya tienes un intercambio activo para este servicio.'
            )

        return attrs

    def create(self, validated_data: dict) -> Trade:
        service   = validated_data['service']
        requester = self.context['request'].user
        offerer   = service.user
        return Trade.objects.create(
            offerer=offerer,
            requester=requester,
            last_proposed_by=requester,
            last_proposed_at=timezone.now(),
            **validated_data,
        )


class TradeNegotiationSerializer(serializers.Serializer):
    scheduled_date = serializers.DateTimeField(required=False)
    credits_amount = serializers.IntegerField(required=False, min_value=1, max_value=20)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=500)
    message = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate_scheduled_date(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError('La fecha programada debe ser en el futuro.')
        return value

    def validate(self, attrs: dict) -> dict:
        trade = self.context['trade']
        request = self.context['request']
        negotiable_fields = {'scheduled_date', 'credits_amount', 'notes'}

        if trade.status != Trade.Status.PENDING:
            raise serializers.ValidationError('Solo se pueden negociar intercambios pendientes.')
        if request.user not in [trade.offerer, trade.requester]:
            raise serializers.ValidationError('No eres participante de este intercambio.')
        if not any(field in attrs for field in negotiable_fields):
            raise serializers.ValidationError('Debes cambiar fecha, créditos o notas.')

        credits_amount = attrs.get('credits_amount', trade.credits_amount)
        if trade.service.type == Service.Type.OFFER and trade.requester.credits < credits_amount:
            raise serializers.ValidationError(
                f'El solicitante no tiene créditos suficientes. Saldo actual: {trade.requester.credits}, '
                f'requeridos: {credits_amount}.'
            )

        return attrs

    @transaction.atomic
    def save(self, **kwargs) -> Trade:
        trade = self.context['trade']
        request = self.context['request']

        for field in ['scheduled_date', 'credits_amount', 'notes']:
            if field in self.validated_data:
                setattr(trade, field, self.validated_data[field])

        trade.last_proposed_by = request.user
        trade.last_proposed_at = timezone.now()
        trade.save(update_fields=[
            'scheduled_date', 'credits_amount', 'notes',
            'last_proposed_by', 'last_proposed_at',
        ])

        create_trade_message(
            trade=trade,
            sender=request.user,
            message_type=Message.Type.TRADE_PROPOSAL,
            action='negotiated',
            content='Nueva propuesta de intercambio',
            message=self.validated_data.get('message', ''),
        )
        return trade


class TradeStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer para gestionar las transiciones de estado de un Trade."""

    # Mapa de transiciones válidas
    VALID_TRANSITIONS = {
        'pending':     ['accepted', 'cancelled'],
        'accepted':    ['in_progress', 'cancelled'],
        'in_progress': ['completed', 'cancelled'],
        'completed':   [],
        'cancelled':   [],
    }

    class Meta:
        model  = Trade
        fields = ['status']

    def validate_status(self, value: str) -> str:
        current = self.instance.status
        allowed = self.VALID_TRANSITIONS.get(current, [])
        if value not in allowed:
            raise serializers.ValidationError(
                f"No se puede pasar de '{current}' a '{value}'. "
                f"Transiciones permitidas: {allowed or 'ninguna'}."
            )
        request = self.context.get('request')
        if (
            request and value == Trade.Status.ACCEPTED
            and self.instance.last_proposed_by_id == request.user.id
        ):
            raise serializers.ValidationError(
                'No puedes aceptar tu propia propuesta. Debe aceptarla la otra persona.'
            )
        return value

    @transaction.atomic
    def update(self, instance: Trade, validated_data: dict) -> Trade:
        new_status = validated_data['status']
        instance.status = new_status

        if new_status == Trade.Status.COMPLETED:
            instance.completed_at = timezone.now()
            self._transfer_credits(instance)

        instance.save()
        request = self.context.get('request')
        if request and new_status in [Trade.Status.ACCEPTED, Trade.Status.CANCELLED]:
            create_trade_message(
                trade=instance,
                sender=request.user,
                message_type=Message.Type.TRADE_STATUS,
                action=new_status,
                content='Propuesta aceptada' if new_status == Trade.Status.ACCEPTED else 'Propuesta cancelada',
            )
        return instance

    def _transfer_credits(self, trade: Trade) -> None:
        """
        Transfiere créditos del requester al offerer y actualiza estadísticas.
        También aplica el bono de onboarding (+1 cr) al offerer si este es
        su primer intercambio completado como proveedor.
        """
        offerer   = trade.offerer
        requester = trade.requester
        amount    = trade.credits_amount
        hours     = max(1, trade.service.duration // 60)

        # ── Verificar si es el primer trade completado como proveedor ──────
        # La consulta se hace ANTES de guardar el estado completed, por lo que
        # el conteo actual es 0 si este es el primero.
        is_first_offerer_trade = not Trade.objects.filter(
            offerer=offerer,
            status=Trade.Status.COMPLETED,
        ).exists()

        # ── Descontar al requester ────────────
        requester.credits          = requester.credits - decimal.Decimal(amount)
        requester.hours_given      += hours
        requester.completed_trades += 1
        requester.save(update_fields=['credits', 'hours_given', 'completed_trades'])
        requester.update_badge()

        Transaction.objects.create(
            user=requester,
            trade=trade,
            amount=decimal.Decimal(-amount),
            transaction_type=Transaction.Type.DEBIT,
        )

        # ── Abonar al offerer ─────────────────
        offerer.credits          = offerer.credits + decimal.Decimal(amount)
        offerer.hours_received   += hours
        offerer.completed_trades += 1
        offerer.save(update_fields=['credits', 'hours_received', 'completed_trades'])
        offerer.update_badge()

        Transaction.objects.create(
            user=offerer,
            trade=trade,
            amount=decimal.Decimal(amount),
            transaction_type=Transaction.Type.CREDIT,
        )

        # ── Bono de onboarding: primer trade como proveedor (+1 cr) ──────────
        if is_first_offerer_trade:
            offerer.refresh_from_db(fields=['credits'])
            offerer.credits += decimal.Decimal('1.0')
            offerer.save(update_fields=['credits'])

            Transaction.objects.create(
                user=offerer,
                trade=trade,
                amount=decimal.Decimal('1.0'),
                transaction_type=Transaction.Type.BONUS,
                description='Bono de onboarding: primer intercambio como proveedor',
            )

class TransactionSerializer(serializers.ModelSerializer):
    trade_id     = serializers.IntegerField(source='trade.id', read_only=True)
    service_name = serializers.SerializerMethodField()

    class Meta:
        model  = Transaction
        fields = ['id', 'trade_id', 'service_name', 'amount', 'transaction_type', 'description', 'created_at']

    def get_service_name(self, obj: Transaction) -> str:
        if obj.trade_id:
            return obj.trade.service.title
        return obj.description or 'Bono de onboarding'


# ══════════════════════════════════════════════════════════
#  MENSAJERÍA
# ══════════════════════════════════════════════════════════

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    trade = TradeSerializer(read_only=True)

    class Meta:
        model  = Message
        fields = [
            'id', 'conversation', 'sender', 'content',
            'message_type', 'trade', 'payload',
            'timestamp', 'read',
        ]
        read_only_fields = ['sender', 'timestamp', 'conversation']


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Message
        fields = ['content']

    def validate_content(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError('El mensaje no puede estar vacío.')
        if len(value.strip()) > 1000:
            raise serializers.ValidationError('El mensaje no puede superar los 1000 caracteres.')
        return value.strip()


class ConversationSerializer(serializers.ModelSerializer):
    participants    = UserSerializer(many=True, read_only=True)
    participant_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, write_only=True,
        label='IDs de participantes'
    )
    last_message   = serializers.SerializerMethodField()
    last_timestamp = serializers.SerializerMethodField()
    unread_count   = serializers.SerializerMethodField()
    messages       = MessageSerializer(many=True, read_only=True)

    class Meta:
        model  = Conversation
        fields = [
            'id', 'participants', 'participant_ids',
            'created_at', 'updated_at',
            'last_message', 'last_timestamp', 'unread_count',
            'messages',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_last_message(self, obj: Conversation) -> str | None:
        last = obj.messages.last()
        return last.content if last else None

    def get_last_timestamp(self, obj: Conversation):
        last = obj.messages.last()
        return last.timestamp if last else obj.created_at

    def get_unread_count(self, obj: Conversation) -> int:
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(read=False).exclude(sender=request.user).count()
        return 0

    def validate_participant_ids(self, value: list) -> list:
        request = self.context['request']
        if request.user not in value:
            value.append(request.user)
        if len(value) < 2:
            raise serializers.ValidationError('Se necesitan al menos 2 participantes.')
        return value

    def create(self, validated_data: dict) -> Conversation:
        participants = validated_data.pop('participant_ids')
        sorted_ids   = sorted(p.id for p in participants)

        for conv in Conversation.objects.prefetch_related('participants'):
            if sorted([p.id for p in conv.participants.all()]) == sorted_ids:
                return conv

        conversation = Conversation.objects.create()
        conversation.participants.set(participants)
        return conversation


# ══════════════════════════════════════════════════════════
#  RESEÑAS
# ══════════════════════════════════════════════════════════

class ReviewSerializer(serializers.ModelSerializer):
    reviewer = UserSerializer(read_only=True)
    reviewee = UserSerializer(read_only=True)

    class Meta:
        model  = Review
        fields = ['id', 'trade', 'reviewer', 'reviewee', 'rating', 'comment', 'created_at']
        read_only_fields = ['reviewer', 'created_at']


class ReviewCreateSerializer(serializers.ModelSerializer):
    trade_id    = serializers.PrimaryKeyRelatedField(
        queryset=Trade.objects.filter(status='completed'),
        source='trade', label='Trade'
    )
    reviewee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='reviewee', label='Usuario valorado'
    )

    class Meta:
        model  = Review
        fields = ['trade_id', 'reviewee_id', 'rating', 'comment']

    def validate_rating(self, value: int) -> int:
        if not 1 <= value <= 5:
            raise serializers.ValidationError('La valoración debe estar entre 1 y 5.')
        return value

    def validate_comment(self, value: str) -> str:
        if len(value.strip()) < 10:
            raise serializers.ValidationError('El comentario debe tener al menos 10 caracteres.')
        return value.strip()

    def validate(self, attrs: dict) -> dict:
        reviewer = self.context['request'].user
        trade    = attrs['trade']
        reviewee = attrs['reviewee']

        if reviewer not in [trade.offerer, trade.requester]:
            raise serializers.ValidationError(
                'No participaste en este intercambio y no puedes valorarlo.'
            )
        if reviewee not in [trade.offerer, trade.requester]:
            raise serializers.ValidationError(
                'El usuario valorado no participó en este intercambio.'
            )
        if reviewer == reviewee:
            raise serializers.ValidationError('No puedes valorarte a ti mismo.')
        if Review.objects.filter(trade=trade, reviewer=reviewer).exists():
            raise serializers.ValidationError('Ya has valorado este intercambio.')

        return attrs

    def create(self, validated_data: dict) -> Review:
        review = Review.objects.create(
            reviewer=self.context['request'].user,
            **validated_data,
        )
        review.reviewee.update_rating()
        return review

class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer con todos los campos para el panel de administración."""
    name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'name',
            'first_name', 'last_name',
            'avatar', 'bio', 'location',
            'credits', 'rating', 'total_reviews',
            'date_joined', 'last_login',
            'badge', 'completed_trades',
            'is_staff', 'is_active',
            'hours_given', 'hours_received',
        ]

    def get_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.username


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para que el administrador modifique usuarios."""
    class Meta:
        model  = User
        fields = ['is_staff', 'is_active', 'credits']

    def validate_credits(self, value) -> decimal.Decimal:
        if value < 0:
            raise serializers.ValidationError('Los créditos no pueden ser negativos mediante ajuste manual.')
        return value

class ContactMessageSerializer(serializers.ModelSerializer):
    """Serializer para el formulario de contacto público."""

    class Meta:
        model  = ContactMessage
        fields = ['id', 'name', 'email', 'reason', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_name(self, value: str) -> str:
        if len(value.strip()) < 2:
            raise serializers.ValidationError('El nombre debe tener al menos 2 caracteres.')
        return value.strip()

    def validate_message(self, value: str) -> str:
        if len(value.strip()) < 20:
            raise serializers.ValidationError('El mensaje debe tener al menos 20 caracteres.')
        return value.strip()

    def validate_reason(self, value: str) -> str:
        valid = [r[0] for r in ContactMessage.Reason.choices]
        if value not in valid:
            raise serializers.ValidationError(f'Motivo inválido. Opciones: {valid}')
        return value


# ─────────────────────────────────────────────
#  PASSWORD RESET
# ─────────────────────────────────────────────


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        try:
            User.objects.get(email__iexact=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('No existe ninguna cuenta con este correo electrónico.')
        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs: dict) -> dict:
        email = attrs.get('email', '').lower()
        code = attrs.get('code', '').strip()

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({'email': 'Usuario no encontrado.'})

        prc = PasswordResetCode.objects.filter(user=user, code=code, used=False).order_by('-created_at').first()
        if not prc:
            raise serializers.ValidationError({'code': 'Código inválido o ya usado.'})
        if prc.is_expired():
            raise serializers.ValidationError({'code': 'El código ha expirado.'})

        # Validar contraseña con las reglas del proyecto
        validate_password(attrs.get('new_password'), user=user)

        attrs['user'] = user
        attrs['prc'] = prc
        return attrs

    def save(self) -> User:
        user = self.validated_data['user']
        prc = self.validated_data['prc']
        new_password = self.validated_data['new_password']

        user.set_password(new_password)
        user.save(update_fields=['password'])

        prc.used = True
        prc.save(update_fields=['used'])

        return user
