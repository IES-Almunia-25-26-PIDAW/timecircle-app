import decimal
from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.throttling import UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from drf_spectacular.utils import (
    extend_schema, extend_schema_view,
    OpenApiParameter, OpenApiResponse, OpenApiExample,
)
from drf_spectacular.types import OpenApiTypes

from django.db.models import Q, Avg, Sum, Count
from django.utils import timezone
from datetime import timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.core import signing
import secrets
from django.conf import settings
from django.core.mail import send_mail

from .models import (
    User, Category, Tag, Skill, Service, Trade, Transaction,
    Conversation, Message, Review, ContactMessage
)
from .serializers import (
    UserRegistrationSerializer, UserSerializer, UserUpdateSerializer, UserRankingSerializer,
    MeSerializer,
    UserSkillSerializer,
    CategorySerializer, TagSerializer, SkillSerializer,
    ServiceSerializer,
    TradeSerializer, TradeCreateSerializer, TradeStatusUpdateSerializer,
    TradeNegotiationSerializer, get_or_create_trade_conversation, create_trade_message,
    TransactionSerializer,
    ConversationSerializer, MessageSerializer, MessageCreateSerializer,
    ReviewSerializer, ReviewCreateSerializer,
    AdminUserSerializer, AdminUserUpdateSerializer, ContactMessageSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from .utils_geo import reverse_geocode


# ── Custom Throttles for presence ────────────────────────
class PresenceThrottle(UserRateThrottle):
    """Allow 120 requests per minute for presence updates (heartbeat, typing, etc.)"""
    scope = 'presence'
    
    def get_rate(self):
        """Return the string throttle rate."""
        return '120/min'


# ══════════════════════════════════════════════════════════
#  CUSTOM JWT — incluye datos del usuario en el token
# ══════════════════════════════════════════════════════════

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


@extend_schema(
    tags=['Auth'],
    summary='Iniciar sesión',
    description='Devuelve un par de tokens JWT (access + refresh) y los datos del usuario.',
    responses={200: OpenApiResponse(description='Login correcto')},
)
class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

@extend_schema(tags=['Auth'])
class RegisterView(generics.CreateAPIView):
    """Registro de nuevo usuario. Devuelve los tokens JWT y el objeto usuario."""
    queryset         = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    @extend_schema(
        summary='Registrar nuevo usuario',
        description=(
            'Crea una cuenta nueva con 0 créditos iniciales. '
            'Los créditos se ganan completando acciones de onboarding: '
            '+0,5 cr al añadir la primera habilidad, '
            '+0,5 cr al publicar el primer servicio, '
            '+1 cr al completar el primer intercambio como proveedor. '
            'Devuelve el objeto usuario y los tokens JWT (access + refresh).'
        ),
        request=UserRegistrationSerializer,
        responses={
            201: OpenApiResponse(description='Usuario creado correctamente'),
            400: OpenApiResponse(description='Datos inválidos o usuario ya existente'),
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user':   UserSerializer(user, context={'request': request}).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access':  str(refresh.access_token),
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=['Auth'])
class MeView(generics.GenericAPIView):
    """Perfil del usuario autenticado (GET) y actualización parcial (PATCH/PUT)."""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='Obtener perfil propio',
        responses={200: UserSerializer},
    )
    def get(self, request):
        return Response(MeSerializer(request.user, context={'request': request}).data)

    @extend_schema(
        summary='Actualizar perfil propio',
        request=UserUpdateSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiResponse(description='Datos inválidos'),
        },
    )
    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Si se han enviado coordenadas, intentar resolver ciudad/país automáticamente
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        try:
            if lat is not None and lon is not None:
                city, country, street, postal_code = reverse_geocode(float(lat), float(lon))
                update_fields = []
                if city:
                    user.city = city
                    update_fields.append('city')
                if country:
                    user.country = country
                    update_fields.append('country')
                # If reverse geocoding provides a street/postal, save them as optional
                if street:
                    user.street_address = street
                    update_fields.append('street_address')
                if postal_code:
                    user.postal_code = postal_code
                    update_fields.append('postal_code')
                if update_fields:
                    user.save(update_fields=update_fields)
        except Exception:
            # Do not let geocoding failures block profile updates
            pass
        return Response(MeSerializer(user, context={'request': request}).data)

    def put(self, request):
        return self.patch(request)


@extend_schema(tags=['Auth'])
class LogoutView(generics.GenericAPIView):
    """Invalida el refresh token (blacklist). Requiere autenticación."""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='Cerrar sesión',
        description='Añade el refresh token a la blacklist de SimpleJWT.',
        request={
            'application/json': {
                'type': 'object',
                'properties': {'refresh': {'type': 'string'}},
                'required': ['refresh'],
            }
        },
        responses={
            200: OpenApiResponse(description='Sesión cerrada correctamente'),
            400: OpenApiResponse(description='Token inválido o expirado'),
        },
    )
    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
            # Marcar presencia como offline inmediatamente y limpiar typing
            try:
                # Import here to avoid import-time cycles when Django loads URLconf
                from .models import UserPresence
                presence = UserPresence.objects.filter(user=request.user).first()
                if presence:
                    # Forzar estado offline usando last_active > 5min
                    presence.last_active = timezone.now() - timedelta(minutes=10)
                    presence.typing_in = None
                    presence.typing_at = None
                    presence.save(update_fields=['last_active', 'typing_in', 'typing_at'])

                    # Notificar a los grupos de conversación relevantes
                    channel_layer = get_channel_layer()
                    conv_ids = Conversation.objects.filter(participants=request.user).values_list('id', flat=True)
                    for cid in conv_ids:
                        group_name = f'conversation_{cid}'
                        async_to_sync(channel_layer.group_send)(
                            group_name,
                            {
                                'type': 'presence.message',
                                'user_id': request.user.id,
                                'status': 'offline',
                                'typing': False,
                            }
                        )
            except Exception:
                # No queremos que la limpieza de presencia falle el logout
                pass

            return Response({'detail': 'Sesión cerrada correctamente.'})
        except Exception:
            return Response(
                {'detail': 'Token inválido o expirado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(tags=['Auth'])
class RequestPasswordResetView(generics.GenericAPIView):
    """Genera un código de 6 dígitos y lo envía por correo al usuario."""
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    @extend_schema(
        summary='Solicitar código de restablecimiento',
        request=PasswordResetRequestSerializer,
        responses={200: OpenApiResponse(description='Código enviado al correo')},
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].lower()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'detail': 'No existe una cuenta con ese correo.'}, status=status.HTTP_400_BAD_REQUEST)

        code = f"{secrets.randbelow(1000000):06d}"
        # Import here to avoid import-time cycles when Django loads URLconf
        from .models import PasswordResetCode
        PasswordResetCode.objects.create(user=user, code=code)

        subject = 'TimeCircle — Código de restablecimiento de contraseña'
        message = (
            f'Hola {user.get_full_name() or user.username},\n\n'
            f'Usa este código para restablecer tu contraseña: {code}\n\n'
            'El código expira en 15 minutos. Si no solicitaste este correo, ignóralo.'
        )
        html_message = f"""
        <!doctype html>
        <html>
        <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Restablecer contraseña</title>
        </head>
        <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f3f4f6;color:#0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:24px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr>
                    <td style="background:linear-gradient(90deg,#059669,#0ea5a5);padding:24px;text-align:left;color:#fff;">
                        <h1 style="margin:0;font-size:20px;">TimeCircle</h1>
                    </td>
                </tr>
                <tr>
                    <td style="padding:24px;color:#0f172a;">
                        <p style="font-size:16px;margin:0 0 8px;">Hola {user.get_full_name() or user.username},</p>
                        <p style="font-size:16px;margin:0 0 16px;">Usa este código para restablecer tu contraseña:</p>
                        <div style="font-size:22px;font-weight:700;background:#f8fafc;padding:16px;border-radius:8px;text-align:center;letter-spacing:4px;">{code}</div>
                        <p style="font-size:14px;color:#6b7280;margin-top:16px;">El código expira en 15 minutos. Si no solicitaste este correo, ignóralo.</p>
                        <hr style="border:none;border-top:1px solid #eef2f7;margin:18px 0;">
                        <p style="font-size:13px;color:#94a3b8;margin:0;">Si tienes problemas, responde a <a style="color:#3b82f6;text-decoration:underline;" href="mailto:soporte@timecircle.app">soporte@timecircle.app</a></p>
                        <p style="font-size:13px;color:#94a3b8;margin:0;">© TimeCircle</p>
                    </td>
                </tr>
            </table>
        </td></tr>
        </table>
        </body>
        </html>
        """
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or settings.EMAIL_HOST_USER or 'no-reply@timecircle.app'
        try:
            send_mail(subject, message, from_email, [user.email], fail_silently=False, html_message=html_message)
        except Exception:
            return Response({'detail': 'Error al enviar el correo.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'detail': 'Código enviado al correo.'})


@extend_schema(tags=['Auth'])
class ConfirmPasswordResetView(generics.GenericAPIView):
    """Valida el código y actualiza la contraseña del usuario."""
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    @extend_schema(
        summary='Confirmar código y cambiar contraseña',
        request=PasswordResetConfirmSerializer,
        responses={200: OpenApiResponse(description='Contraseña actualizada correctamente')},
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Contraseña actualizada correctamente.'})


@extend_schema(tags=['Auth'])
class WSPresenceHandshakeView(generics.GenericAPIView):
    """Devuelve un `ws_key` firmado de corta duración para autenticación WS.

    El cliente obtiene este token via REST (POST) y lo pasa como query param
    al abrir el socket: `ws://.../ws/presence/?ws_key=...`.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Firma un payload con el user_id; el consumer validará con max_age
        token = signing.dumps({'user_id': request.user.id})
        return Response({'ws_key': token})

@extend_schema_view(
    list=extend_schema(
        tags=['Users'],
        summary='Listar usuarios activos',
        parameters=[
            OpenApiParameter('search',   OpenApiTypes.STR, description='Búsqueda por nombre, email o ubicación'),
            OpenApiParameter('location', OpenApiTypes.STR, description='Filtrar por ciudad/localidad'),
            OpenApiParameter('ordering', OpenApiTypes.STR, description='Ordenar por: rating, completed_trades, date_joined, credits'),
        ],
    ),
    retrieve=extend_schema(tags=['Users'], summary='Obtener usuario por ID'),
    update=extend_schema(tags=['Users'], summary='Actualizar usuario (solo el propio)'),
    partial_update=extend_schema(tags=['Users'], summary='Actualizar parcialmente usuario (solo el propio)'),
)
class UserViewSet(viewsets.ModelViewSet):
    queryset           = User.objects.filter(is_active=True).order_by('-date_joined')
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['first_name', 'last_name', 'username', 'email', 'location']
    ordering_fields    = ['rating', 'completed_trades', 'date_joined', 'credits']
    # Allow POST here so custom actions (e.g. POST /api/users/skills/) can accept POST.
    http_method_names  = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if user != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'No tienes permiso para modificar este perfil.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    # ── Acciones extra ────────────────────────

    @extend_schema(
        tags=['Users'],
        summary='Ranking de usuarios más solidarios',
        responses={200: UserRankingSerializer(many=True)},
    )
    @action(detail=False, methods=['get'], url_path='ranking')
    def ranking(self, request):
        users = User.objects.filter(is_active=True).order_by(
            '-completed_trades', '-rating', '-hours_given'
        )[:50]
        return Response(UserRankingSerializer(users, many=True).data)

    @extend_schema(tags=['Users'], summary='Servicios publicados por un usuario', responses={200: ServiceSerializer(many=True)})
    @action(detail=True, methods=['get'], url_path='services')
    def services(self, request, pk=None):
        user     = self.get_object()
        services = Service.objects.filter(user=user).select_related('category').prefetch_related('tags')
        return Response(ServiceSerializer(services, many=True, context={'request': request}).data)

    @extend_schema(tags=['Users'], summary='Reseñas recibidas por un usuario', responses={200: ReviewSerializer(many=True)})
    @action(detail=True, methods=['get'], url_path='reviews')
    def reviews(self, request, pk=None):
        user    = self.get_object()
        reviews = Review.objects.filter(reviewee=user).select_related('reviewer', 'trade')
        return Response(ReviewSerializer(reviews, many=True, context={'request': request}).data)

    @extend_schema(
        tags=['Users'],
        summary='Habilidades del usuario autenticado',
        description=(
            'GET: devuelve las habilidades propias.\n\n'
            'POST: añade una habilidad. Si es la **primera** habilidad del usuario, '
            'se otorga automáticamente un **bono de +0,5 créditos de onboarding**.'
        ),
        responses={200: UserSkillSerializer(many=True)},
    )
    @action(detail=False, methods=['get', 'post'], url_path='skills')
    def skills(self, request):
        if request.method == 'GET':
            qs = request.user.user_skills.select_related('skill')
            return Response(UserSkillSerializer(qs, many=True).data)

        # POST — crear habilidad
        serializer = UserSkillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)

        # ── Bono de onboarding: primera habilidad (+0,5 cr) ──────────────────
        if request.user.user_skills.count() == 1:
            request.user.refresh_from_db(fields=['credits'])
            request.user.credits += decimal.Decimal('0.5')
            request.user.save(update_fields=['credits'])

            Transaction.objects.create(
                user=request.user,
                trade=None,
                amount=decimal.Decimal('0.5'),
                transaction_type=Transaction.Type.BONUS,
                description='Bono de onboarding: primera habilidad añadida',
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=['Users'],
        summary='Historial de transacciones del usuario autenticado',
        responses={200: TransactionSerializer(many=True)},
    )
    @action(detail=False, methods=['get'], url_path='transactions')
    def transactions(self, request):
        qs = Transaction.objects.filter(user=request.user).select_related('trade__service')
        return Response(TransactionSerializer(qs, many=True).data)

    @extend_schema(
        tags=['Users'],
        summary='Datos de actividad mensual del usuario autenticado',
        description='Devuelve estadísticas de los últimos 6 meses para construir gráficos.',
    )
    @action(detail=False, methods=['get'], url_path='activity')
    def activity(self, request):
        user   = request.user
        now    = timezone.now()
        months = []

        for i in range(5, -1, -1):
            start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
            end   = (start + timedelta(days=32)).replace(day=1)

            given    = Trade.objects.filter(
                offerer=user, status='completed',
                completed_at__gte=start, completed_at__lt=end,
            ).count()
            received = Trade.objects.filter(
                requester=user, status='completed',
                completed_at__gte=start, completed_at__lt=end,
            ).count()

            months.append({
                'month':           start.strftime('%B %Y'),
                'trades_given':    given,
                'trades_received': received,
            })

        return Response({
            'monthly_activity':   months,
            'total_trades':       Trade.objects.filter(Q(offerer=user) | Q(requester=user)).count(),
            'completed_trades':   user.completed_trades,
            'credits':            float(user.credits),
            'hours_given':        user.hours_given,
            'hours_received':     user.hours_received,
            'rating':             float(user.rating),
        })


# ══════════════════════════════════════════════════════════
#  CATEGORÍAS / TAGS / HABILIDADES
# ══════════════════════════════════════════════════════════

@extend_schema(tags=['Categories'])
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = Category.objects.all()
    serializer_class   = CategorySerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Listar todas las categorías')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(summary='Obtener categoría por ID')
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


@extend_schema(tags=['Tags'])
class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset           = Tag.objects.all()
    serializer_class   = TagSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Listar todas las etiquetas')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


@extend_schema(tags=['Skills'])
class SkillViewSet(viewsets.ModelViewSet):
    queryset           = Skill.objects.all()
    serializer_class   = SkillSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Listar habilidades')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(summary='Crear habilidad (Admin)')
    def create(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {'detail': 'Solo los administradores pueden crear habilidades.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

@extend_schema_view(
    list=extend_schema(
        tags=['Services'],
        summary='Listar servicios',
        parameters=[
            OpenApiParameter('type',        OpenApiTypes.STR, description='offer | request'),
            OpenApiParameter('category',    OpenApiTypes.INT, description='ID de categoría'),
            OpenApiParameter('status',      OpenApiTypes.STR, description='active | paused | completed'),
            OpenApiParameter('my_services', OpenApiTypes.BOOL, description='true → solo mis servicios'),
            OpenApiParameter('search',      OpenApiTypes.STR, description='Búsqueda en título/descripción'),
            OpenApiParameter('ordering',    OpenApiTypes.STR, description='created_at | credits | duration'),
        ],
    ),
    retrieve=extend_schema(tags=['Services'], summary='Obtener servicio por ID'),
    create=extend_schema(
        tags=['Services'],
        summary='Publicar nuevo servicio',
        description=(
            'Crea una oferta o solicitud de servicio. '
            'Si es el **primer servicio** del usuario, se otorga automáticamente '
            'un **bono de +0,5 créditos de onboarding**.'
        ),
    ),
    update=extend_schema(tags=['Services'], summary='Actualizar servicio completo'),
    partial_update=extend_schema(tags=['Services'], summary='Actualizar servicio parcialmente'),
    destroy=extend_schema(tags=['Services'], summary='Eliminar servicio'),
)
class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class   = ServiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['title', 'description']
    ordering_fields    = ['created_at', 'credits', 'duration']

    def get_queryset(self):
        qs = Service.objects.select_related('user', 'category').prefetch_related('tags')

        t = self.request.query_params.get('type')
        if t in ['offer', 'request']:
            qs = qs.filter(type=t)

        cat = self.request.query_params.get('category')
        if cat and cat.isdigit():
            qs = qs.filter(category_id=int(cat))

        st = self.request.query_params.get('status')
        if st in ['active', 'paused', 'completed']:
            qs = qs.filter(status=st)

        if self.request.query_params.get('my_services') == 'true':
            qs = qs.filter(user=self.request.user)

        return qs.order_by('-created_at')

    # Creation handled by ModelViewSet using `ServiceSerializer` and `perform_create`.

    def _passes_city_filter(self, item: dict, viewer_city: str | None, my_city_only: bool) -> bool:
        """Return False when city-only mode is active and the owner's city doesn't match."""
        if not (my_city_only and viewer_city):
            return True
        owner_city = item.get("user", {}).get("city")
        return bool(owner_city) and owner_city.lower() == viewer_city.lower()


    def _passes_distance_filter(self, item: dict, max_km: float | None) -> bool:
        """Return False when the item exceeds the requested max distance."""
        if max_km is None:
            return True

        dist = item.get("distance_km")
        if dist is None:
            return False                       # distance unknown → exclude item

        return float(dist) <= max_km


    def _get_viewer_city(self, request) -> str | None:
        explicit = request.query_params.get("viewer_city")
        if explicit:
            return explicit
        return request.user.city if request.user.is_authenticated else None


    def list(self, request, *args, **kwargs):
        max_dist = request.query_params.get("max_distance_km")
        try:
            max_km = float(max_dist) if max_dist not in (None, "") else None
        except (TypeError, ValueError):
            max_km = None
        """Override to allow distance-based filtering when viewer coordinates are supplied."""
        qs = self.filter_queryset(self.get_queryset())
        serialized = ServiceSerializer(
            list(qs), many=True, context={"request": request}
        ).data

        my_city_only = request.query_params.get("my_city_only") == "true"
        viewer_city = self._get_viewer_city(request)

        filtered = [
            item for item in serialized
            if self._passes_city_filter(item, viewer_city, my_city_only)
            and self._passes_distance_filter(item, max_km)
        ]

        return Response(filtered)

    def perform_create(self, serializer):
        user = self.request.user

        # Verificar si es el primer servicio ANTES de crearlo
        is_first_service = not Service.objects.filter(user=user).exists()

        serializer.save(user=user)

        # ── Bono de onboarding: primer servicio publicado (+0,5 cr) ──────────
        if is_first_service:
            user.refresh_from_db(fields=['credits'])
            user.credits += decimal.Decimal('0.5')
            user.save(update_fields=['credits'])

            Transaction.objects.create(
                user=user,
                trade=None,
                amount=decimal.Decimal('0.5'),
                transaction_type=Transaction.Type.BONUS,
                description='Bono de onboarding: primer servicio publicado',
            )

    def _check_owner(self, request, service):
        if service.user != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'No tienes permiso para modificar este servicio.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def update(self, request, *args, **kwargs):
        err = self._check_owner(request, self.get_object())
        return err or super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = self._check_owner(request, self.get_object())
        return err or super().destroy(request, *args, **kwargs)


# ══════════════════════════════════════════════════════════
#  INTERCAMBIOS (TRADES)
# ══════════════════════════════════════════════════════════

@extend_schema_view(
    list=extend_schema(
        tags=['Trades'],
        summary='Listar intercambios del usuario autenticado',
        parameters=[
            OpenApiParameter('status', OpenApiTypes.STR,
                             description='pending | accepted | in_progress | completed | cancelled'),
            OpenApiParameter('role',   OpenApiTypes.STR,
                             description='offerer | requester'),
        ],
    ),
    retrieve=extend_schema(tags=['Trades'], summary='Obtener intercambio por ID'),
    create=extend_schema(
        tags=['Trades'],
        summary='Crear solicitud de intercambio',
        description=(
            'Inicia un nuevo Trade en estado `pending`. '
            'Se valida que el solicitante tenga saldo suficiente y '
            'no tenga otro trade activo para el mismo servicio.'
        ),
    ),
)
class TradeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names  = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return TradeCreateSerializer
        if self.action == 'update_status':
            return TradeStatusUpdateSerializer
        if self.action == 'negotiate':
            return TradeNegotiationSerializer
        return TradeSerializer

    def get_queryset(self):
        user = self.request.user
        qs   = Trade.objects.filter(
            Q(offerer=user) | Q(requester=user)
        ).select_related(
            'service__user', 'service__category',
            'offerer', 'requester', 'last_proposed_by',
        )

        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)

        role = self.request.query_params.get('role')
        if role == 'offerer':
            qs = qs.filter(offerer=user)
        elif role == 'requester':
            qs = qs.filter(requester=user)

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trade = serializer.save()
        conversation = get_or_create_trade_conversation(trade)
        message = create_trade_message(
            trade=trade,
            sender=request.user,
            message_type=Message.Type.TRADE_PROPOSAL,
            action='created',
            content='Nueva solicitud de intercambio',
            message=trade.notes,
        )
        return Response(
            {
                'trade': TradeSerializer(trade, context={'request': request}).data,
                'conversation': ConversationSerializer(conversation, context={'request': request}).data,
                'message': MessageSerializer(message, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        tags=['Trades'],
        summary='Actualizar estado del intercambio',
        description=(
            '**Transiciones permitidas:**\n\n'
            '| Estado actual | Puede pasar a           |\n'
            '|---------------|-------------------------|\n'
            '| pending       | accepted, cancelled     |\n'
            '| accepted      | in_progress, cancelled  |\n'
            '| in_progress   | completed, cancelled    |\n'
            '| completed     | — (estado final)        |\n'
            '| cancelled     | — (estado final)        |\n\n'
            'Al pasar a **completed**: los créditos se transfieren automáticamente, '
            'se actualizan las estadísticas y, si es el primer trade completado como '
            'proveedor, el offerer recibe **+1 cr de bono de onboarding**.'
        ),
        request=TradeStatusUpdateSerializer,
        responses={
            200: TradeSerializer,
            400: OpenApiResponse(description='Transición de estado inválida'),
            403: OpenApiResponse(description='No eres participante de este intercambio'),
        },
    )
    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        trade = self.get_object()
        if request.user not in [trade.offerer, trade.requester]:
            return Response(
                {'detail': 'No eres participante de este intercambio.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = TradeStatusUpdateSerializer(
            trade, data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        trade = serializer.save()
        return Response(TradeSerializer(trade, context={'request': request}).data)

    @extend_schema(
        tags=['Trades'],
        summary='Negociar propuesta de intercambio',
        description='Actualiza fecha, créditos y/o notas de un trade pendiente y crea una tarjeta de propuesta en el chat.',
        request=TradeNegotiationSerializer,
        responses={
            200: TradeSerializer,
            400: OpenApiResponse(description='Datos inválidos o trade no negociable'),
            403: OpenApiResponse(description='No eres participante de este intercambio'),
        },
    )
    @action(detail=True, methods=['patch'], url_path='negotiate')
    def negotiate(self, request, pk=None):
        trade = self.get_object()
        if request.user not in [trade.offerer, trade.requester]:
            return Response(
                {'detail': 'No eres participante de este intercambio.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = TradeNegotiationSerializer(
            data=request.data,
            context={'request': request, 'trade': trade},
        )
        serializer.is_valid(raise_exception=True)
        trade = serializer.save()
        return Response(TradeSerializer(trade, context={'request': request}).data)


# ══════════════════════════════════════════════════════════
#  MENSAJERÍA
# ══════════════════════════════════════════════════════════

@extend_schema_view(
    list=extend_schema(
        tags=['Conversations'],
        summary='Listar conversaciones del usuario autenticado',
        description='Incluye el último mensaje y el contador de no leídos.',
    ),
    retrieve=extend_schema(
        tags=['Conversations'],
        summary='Obtener conversación con todos sus mensajes',
    ),
    create=extend_schema(
        tags=['Conversations'],
        summary='Crear o recuperar una conversación',
    ),
)
class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PresenceThrottle]  # Allow more requests for conversations (messages, mark read)
    http_method_names  = ['get', 'post', 'head', 'options', 'patch']

    def get_serializer_class(self):
        return ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants', 'messages__sender').order_by('-updated_at')

    @extend_schema(
        tags=['Conversations'],
        summary='Enviar mensaje en una conversación',
        request=MessageCreateSerializer,
        responses={201: MessageSerializer, 403: OpenApiResponse(description='No eres participante')},
    )
    @action(detail=True, methods=['post'], url_path='messages')
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        if request.user not in conversation.participants.all():
            return Response(
                {'detail': 'No eres participante de esta conversación.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=serializer.validated_data['content'],
        )
        conversation.save()

        return Response(
            MessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        tags=['Conversations'],
        summary='Marcar mensajes como leídos',
        responses={200: OpenApiResponse(description='Número de mensajes marcados como leídos')},
    )
    @action(detail=True, methods=['patch'], url_path='read')
    def mark_as_read(self, request, pk=None):
        conversation = self.get_object()
        if request.user not in conversation.participants.all():
            return Response(
                {'detail': 'No eres participante de esta conversación.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        count = Message.objects.filter(
            conversation=conversation, read=False
        ).exclude(sender=request.user).update(read=True)

        return Response({'marked_as_read': count})


# ══════════════════════════════════════════════════════════
#  RESEÑAS
# ══════════════════════════════════════════════════════════

@extend_schema_view(
    list=extend_schema(
        tags=['Reviews'],
        summary='Listar reseñas',
        parameters=[
            OpenApiParameter('trade',    OpenApiTypes.INT, description='Filtrar por ID de trade'),
            OpenApiParameter('reviewee', OpenApiTypes.INT, description='Filtrar por usuario valorado'),
            OpenApiParameter('reviewer', OpenApiTypes.INT, description='Filtrar por usuario valorador'),
        ],
    ),
    retrieve=extend_schema(tags=['Reviews'], summary='Obtener reseña por ID'),
    create=extend_schema(
        tags=['Reviews'],
        summary='Crear reseña tras intercambio completado',
    ),
)
class ReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names  = ['get', 'post', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return ReviewCreateSerializer
        return ReviewSerializer

    def get_queryset(self):
        qs = Review.objects.select_related('reviewer', 'reviewee', 'trade')

        trade_id = self.request.query_params.get('trade')
        if trade_id and trade_id.isdigit():
            qs = qs.filter(trade_id=int(trade_id))

        reviewee_id = self.request.query_params.get('reviewee')
        if reviewee_id and reviewee_id.isdigit():
            qs = qs.filter(reviewee_id=int(reviewee_id))

        reviewer_id = self.request.query_params.get('reviewer')
        if reviewer_id and reviewer_id.isdigit():
            qs = qs.filter(reviewer_id=int(reviewer_id))

        return qs.order_by('-created_at')


# ══════════════════════════════════════════════════════════
#  PANEL DE ADMINISTRACIÓN
# ══════════════════════════════════════════════════════════

@extend_schema(tags=['Admin'])
class AdminStatsView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary='Estadísticas globales de TimeCircle',
        responses={200: OpenApiResponse(description='Estadísticas de la plataforma')},
    )
    def get(self, request):
        last_30 = timezone.now() - timedelta(days=30)

        stats = {
            'total_users': User.objects.filter(is_active=True).count(),
            'active_users_last_30_days': User.objects.filter(last_login__gte=last_30).count(),
            'total_services': Service.objects.count(),
            'services_by_type': {
                'offers':   Service.objects.filter(type='offer').count(),
                'requests': Service.objects.filter(type='request').count(),
            },
            'services_by_status': {
                s: Service.objects.filter(status=s).count()
                for s in ['active', 'paused', 'completed']
            },
            'total_trades': Trade.objects.count(),
            'trades_by_status': {
                s: Trade.objects.filter(status=s).count()
                for s in ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']
            },
            'trades_last_30_days': Trade.objects.filter(created_at__gte=last_30).count(),
            'total_reviews': Review.objects.count(),
            'avg_rating':    Review.objects.aggregate(avg=Avg('rating'))['avg'] or 0,
            'total_hours_exchanged': User.objects.aggregate(total=Sum('hours_given'))['total'] or 0,
            'total_credits_in_system': float(
                User.objects.aggregate(total=Sum('credits'))['total'] or 0
            ),
            'top_categories': list(
                Service.objects.values('category__name')
                .annotate(count=Count('id'))
                .order_by('-count')[:5]
            ),
        }
        return Response(stats)


@extend_schema_view(
    list=extend_schema(
        tags=['Admin'],
        summary='Listar todos los usuarios (Admin)',
        parameters=[
            OpenApiParameter('search',    OpenApiTypes.STR,  description='Búsqueda'),
            OpenApiParameter('is_active', OpenApiTypes.BOOL, description='Filtrar por estado'),
        ],
    ),
    retrieve=extend_schema(tags=['Admin'], summary='Obtener usuario (Admin)'),
    partial_update=extend_schema(tags=['Admin'], summary='Modificar usuario (Admin)'),
    destroy=extend_schema(tags=['Admin'], summary='Desactivar usuario (Admin)'),
)
class AdminUserViewSet(viewsets.ModelViewSet):
    queryset           = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAdminUser]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['username', 'email', 'first_name', 'last_name', 'location']
    ordering_fields    = ['date_joined', 'last_login', 'credits', 'rating', 'completed_trades']
    http_method_names  = ['get', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return AdminUserUpdateSerializer
        return AdminUserSerializer

    def get_queryset(self):
        qs        = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {'detail': 'No puedes desactivarte a ti mismo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(
            {'detail': f'Usuario "{user.username}" desactivado correctamente.'},
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=['Admin'], summary='Reactivar usuario desactivado (Admin)', responses={200: AdminUserSerializer})
    @action(detail=True, methods=['patch'], url_path='activate')
    def activate(self, request, pk=None):
        user           = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response(AdminUserSerializer(user).data)

    @extend_schema(tags=['Admin'], summary='Estadísticas individuales de un usuario (Admin)')
    @action(detail=True, methods=['get'], url_path='stats')
    def user_stats(self, request, pk=None):
        user = self.get_object()
        return Response({
            'user':              AdminUserSerializer(user).data,
            'trades_as_offerer': Trade.objects.filter(offerer=user).count(),
            'trades_as_requester': Trade.objects.filter(requester=user).count(),
            'completed_trades':  user.completed_trades,
            'total_reviews_given':    user.given_reviews.count(),
            'total_reviews_received': user.received_reviews.count(),
            'avg_rating_given':   user.given_reviews.aggregate(avg=Avg('rating'))['avg'] or 0,
            'services_published': user.services.count(),
            'credits_history':    TransactionSerializer(
                user.transactions.order_by('-created_at')[:20], many=True
            ).data,
        })


@extend_schema(tags=['Admin'])
class AdminGeoStatsView(generics.GenericAPIView):
    """Estadísticas geográficas simples para el panel de administración.

    Devuelve agrupaciones aproximadas (centros redondeados a 2 decimales)
    con el recuento de usuarios activos y servicios, útiles para mostrar en
    un mapa sin exponer coordenadas exactas.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.filter(is_active=True, latitude__isnull=False, longitude__isnull=False)
        services = Service.objects.filter(user__latitude__isnull=False, user__longitude__isnull=False)

        def group_by_cell(qs):
            cells = {}
            for obj in qs:
                u = obj
                if hasattr(obj, 'user'):
                    u = obj.user
                try:
                    lat = round(float(u.latitude), 2)
                    lon = round(float(u.longitude), 2)
                except Exception:
                    continue
                key = f"{lat}:{lon}"
                cells.setdefault(key, {'lat': lat, 'lon': lon, 'count': 0})['count'] += 1
            return list(cells.values())

        user_cells = group_by_cell(users)
        service_cells = group_by_cell(services)

        return Response({'user_cells': user_cells, 'service_cells': service_cells})

@extend_schema(tags=['Contact'])
class ContactView(generics.CreateAPIView):
    queryset           = ContactMessage.objects.all()
    serializer_class   = ContactMessageSerializer
    permission_classes = [AllowAny]

    @extend_schema(
        summary='Enviar mensaje de contacto',
        request=ContactMessageSerializer,
        responses={201: OpenApiResponse(description='Mensaje recibido correctamente'), 400: OpenApiResponse(description='Datos inválidos')},
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Mensaje recibido. Te responderemos en 2–5 días hábiles.'},
            status=status.HTTP_201_CREATED,
        )

# ══════════════════════════════════════════════════════════
#  PRESENCIA EN TIEMPO REAL
# ══════════════════════════════════════════════════════════

@extend_schema(tags=['Presence'])
class PresenceHeartbeatView(generics.GenericAPIView):
    """
    Heartbeat de presencia.
    El cliente llama a este endpoint cada 30 s con {'status': 'online'|'away'}.
    Si no recibe heartbeat en 5 min el servidor considera al usuario 'offline'.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [PresenceThrottle]

    @extend_schema(
        summary='Enviar heartbeat de presencia',
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'status': {'type': 'string', 'enum': ['online', 'away']},
                },
            }
        },
        responses={200: OpenApiResponse(description='OK')},
    )
    def post(self, request):
        raw_status = request.data.get('status', 'online')
        if raw_status not in ['online', 'away']:
            raw_status = 'online'

        from .models import UserPresence
        UserPresence.objects.update_or_create(
            user=request.user,
            defaults={
                'status':      raw_status,
                'last_active': timezone.now(),
            },
        )
        return Response({'ok': True})

@extend_schema(tags=['Presence'])
class PresenceTypingView(generics.GenericAPIView):
    """
    Actualiza el estado de escritura del usuario autenticado
    en una conversación concreta.
    La señal caduca automáticamente en el servidor a los 5 s.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [PresenceThrottle]

    @extend_schema(
        summary='Actualizar estado de escritura',
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'conversation_id': {'type': 'integer'},
                    'is_typing':       {'type': 'boolean'},
                },
                'required': ['conversation_id', 'is_typing'],
            }
        },
        responses={200: OpenApiResponse(description='OK')},
    )
    def post(self, request):
        conv_id   = request.data.get('conversation_id')
        is_typing = bool(request.data.get('is_typing', False))

        conv = None
        if is_typing and conv_id:
            try:
                conv = Conversation.objects.get(
                    id=conv_id, participants=request.user
                )
            except Conversation.DoesNotExist:
                return Response(
                    {'detail': 'Conversación no encontrada.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

        from .models import UserPresence
        UserPresence.objects.update_or_create(
            user=request.user,
            defaults={
                'typing_in': conv,
                'typing_at': timezone.now() if is_typing else None,
            },
        )
        return Response({'is_typing': is_typing})


@extend_schema(tags=['Presence'])
class PresenceStatusView(generics.GenericAPIView):
    """
    Devuelve el estado de presencia de un usuario concreto y
    si está escribiendo en la conversación indicada.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [PresenceThrottle]

    @extend_schema(
        summary='Consultar presencia de un usuario',
        parameters=[
            OpenApiParameter('user_id',         OpenApiTypes.INT, description='ID del usuario'),
            OpenApiParameter('conversation_id',  OpenApiTypes.INT, description='ID de la conversación'),
        ],
        responses={
            200: OpenApiResponse(
                description='Estado de presencia',
                response={
                    'type': 'object',
                    'properties': {
                        'status':    {'type': 'string', 'enum': ['online', 'away', 'offline']},
                        'is_typing': {'type': 'boolean'},
                    },
                },
            )
        },
    )
    def get(self, request):
        user_id = request.query_params.get('user_id')
        conv_id = request.query_params.get('conversation_id')

        if not user_id:
            return Response(
                {'detail': 'user_id es obligatorio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from .models import UserPresence
        try:
            presence = UserPresence.objects.get(user_id=user_id)
        except UserPresence.DoesNotExist:
            return Response({'status': 'offline', 'is_typing': False})

        effective = presence.effective_status

        is_typing = False
        if conv_id:
            typing_conv_id = presence.typing_conversation_id
            is_typing = typing_conv_id is not None and str(typing_conv_id) == str(conv_id)

        return Response({'status': effective, 'is_typing': is_typing})
