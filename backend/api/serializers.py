import decimal
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone

from .models import (
    User, Category, Tag, Skill, UserSkill, Service, Trade,
    Transaction, Conversation, Message, Review, ContactMessage
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


# ══════════════════════════════════════════════════════════
#  USUARIOS
# ══════════════════════════════════════════════════════════

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
        # Los nuevos usuarios empiezan con 0 créditos.
        # Ganan créditos completando acciones de onboarding:
        #   +0,5 cr al añadir su primera habilidad
        #   +0,5 cr al publicar su primer servicio
        #   +1,0 cr al completar su primer intercambio como proveedor
        user = User.objects.create_user(credits=decimal.Decimal('0.0'), **validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer de lectura con todos los campos públicos del usuario."""

    name         = serializers.SerializerMethodField()
    skills       = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source='date_joined', read_only=True)
    is_admin     = serializers.BooleanField(source='is_staff', read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'name', 'first_name', 'last_name',
            'avatar', 'bio', 'location',
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

    def get_skills(self, obj: User) -> list[str]:
        return list(
            obj.user_skills.select_related('skill').values_list('skill__name', flat=True)
        )


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para que el propio usuario edite su perfil."""

    class Meta:
        model  = User
        fields = ['first_name', 'last_name', 'avatar', 'bio', 'location']

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


# ══════════════════════════════════════════════════════════
#  SERVICIOS
# ══════════════════════════════════════════════════════════

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

    class Meta:
        model  = Service
        fields = [
            'id', 'user',
            'type', 'title', 'description',
            'category', 'category_id',
            'duration', 'credits', 'status',
            'created_at', 'tags', 'tag_ids',
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


class TradeSerializer(serializers.ModelSerializer):
    """Serializer de lectura completo de un Trade."""
    service   = ServiceSerializer(read_only=True)
    offerer   = UserSerializer(read_only=True)
    requester = UserSerializer(read_only=True)
    reviews   = ReviewSummarySerializer(many=True, read_only=True)

    class Meta:
        model  = Trade
        fields = [
            'id', 'service', 'offerer', 'requester',
            'status', 'scheduled_date', 'credits_amount',
            'notes', 'created_at', 'completed_at', 'reviews',
        ]
        read_only_fields = ['offerer', 'requester', 'created_at', 'completed_at']


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

        # Los créditos deben coincidir con el servicio
        if attrs.get('credits_amount') != service.credits:
            raise serializers.ValidationError({
                'credits_amount': f'El monto de créditos debe ser {service.credits} (el precio del servicio).'
            })

        # El solicitante debe tener saldo suficiente (si solicita una oferta)
        if service.type == Service.Type.OFFER:
            if requester.credits < service.credits:
                raise serializers.ValidationError(
                    f'No tienes créditos suficientes. Saldo actual: {requester.credits}, '
                    f'requeridos: {service.credits}.'
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
        return Trade.objects.create(offerer=offerer, requester=requester, **validated_data)


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
        return value

    @transaction.atomic
    def update(self, instance: Trade, validated_data: dict) -> Trade:
        new_status = validated_data['status']
        instance.status = new_status

        if new_status == Trade.Status.COMPLETED:
            instance.completed_at = timezone.now()
            self._transfer_credits(instance)

        instance.save()
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


# ══════════════════════════════════════════════════════════
#  TRANSACCIONES
# ══════════════════════════════════════════════════════════

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

    class Meta:
        model  = Message
        fields = ['id', 'conversation', 'sender', 'content', 'timestamp', 'read']
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


# ══════════════════════════════════════════════════════════
#  ADMIN
# ══════════════════════════════════════════════════════════

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


# ══════════════════════════════════════════════════════════
#  CONTACTO
# ══════════════════════════════════════════════════════════

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