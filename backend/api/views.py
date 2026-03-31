from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
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

from .models import (
    User, Category, Tag, Skill,
    Service, Trade, Transaction,
    Conversation, Message, Review,
)
from .serializers import (
    UserRegistrationSerializer, UserSerializer, UserUpdateSerializer, UserRankingSerializer,
    UserSkillSerializer,
    CategorySerializer, TagSerializer, SkillSerializer,
    ServiceSerializer,
    TradeSerializer, TradeCreateSerializer, TradeStatusUpdateSerializer,
    TransactionSerializer,
    ConversationSerializer, MessageSerializer, MessageCreateSerializer,
    ReviewSerializer, ReviewCreateSerializer,
    AdminUserSerializer, AdminUserUpdateSerializer,
)


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


# ══════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════

@extend_schema(tags=['Auth'])
class RegisterView(generics.CreateAPIView):
    """Registro de nuevo usuario. Devuelve los tokens JWT y el objeto usuario."""
    queryset         = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    @extend_schema(
        summary='Registrar nuevo usuario',
        description=(
            'Crea una cuenta nueva con 10 créditos iniciales. '
            'Devuelve el objeto usuario y los tokens JWT (access + refresh).'
        ),
        request=UserRegistrationSerializer,
        responses={
            201: OpenApiResponse(description='Usuario creado correctamente'),
            400: OpenApiResponse(description='Datos inválidos o usuario ya existente'),
        },
        examples=[
            OpenApiExample(
                'Registro mínimo',
                value={
                    'username': 'maria_vecina',
                    'email': 'maria@ejemplo.com',
                    'first_name': 'María',
                    'last_name': 'García',
                    'password': 'Segura1234!',
                    'password2': 'Segura1234!',
                    'location': 'Madrid',
                    'bio': 'Me encanta ayudar a mis vecinos',
                },
                request_only=True,
            )
        ],
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
        return Response(UserSerializer(request.user, context={'request': request}).data)

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
        return Response(UserSerializer(user, context={'request': request}).data)

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
            return Response({'detail': 'Sesión cerrada correctamente.'})
        except Exception:
            return Response(
                {'detail': 'Token inválido o expirado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ══════════════════════════════════════════════════════════
#  USUARIOS
# ══════════════════════════════════════════════════════════

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
    http_method_names  = ['get', 'put', 'patch', 'head', 'options']

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
        description=(
            'Top 50 usuarios ordenados por trades completados, valoración media '
            'y horas donadas. Incluye insignia (gold/silver/bronze).'
        ),
        responses={200: UserRankingSerializer(many=True)},
    )
    @action(detail=False, methods=['get'], url_path='ranking')
    def ranking(self, request):
        users = User.objects.filter(is_active=True).order_by(
            '-completed_trades', '-rating', '-hours_given'
        )[:50]
        return Response(UserRankingSerializer(users, many=True).data)

    @extend_schema(
        tags=['Users'],
        summary='Servicios publicados por un usuario',
        responses={200: ServiceSerializer(many=True)},
    )
    @action(detail=True, methods=['get'], url_path='services')
    def services(self, request, pk=None):
        user     = self.get_object()
        services = Service.objects.filter(user=user).select_related('category').prefetch_related('tags')
        return Response(ServiceSerializer(services, many=True, context={'request': request}).data)

    @extend_schema(
        tags=['Users'],
        summary='Reseñas recibidas por un usuario',
        responses={200: ReviewSerializer(many=True)},
    )
    @action(detail=True, methods=['get'], url_path='reviews')
    def reviews(self, request, pk=None):
        user    = self.get_object()
        reviews = Review.objects.filter(reviewee=user).select_related('reviewer', 'trade')
        return Response(ReviewSerializer(reviews, many=True, context={'request': request}).data)

    @extend_schema(
        tags=['Users'],
        summary='Habilidades del usuario autenticado',
        responses={200: UserSkillSerializer(many=True)},
    )
    @action(detail=False, methods=['get', 'post'], url_path='skills')
    def skills(self, request):
        if request.method == 'GET':
            qs = request.user.user_skills.select_related('skill')
            return Response(UserSkillSerializer(qs, many=True).data)

        serializer = UserSkillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
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
            'credits':            user.credits,
            'hours_given':        user.hours_given,
            'hours_received':     user.hours_received,
            'rating':             float(user.rating),
        })


# ══════════════════════════════════════════════════════════
#  CATEGORÍAS / TAGS / HABILIDADES
# ══════════════════════════════════════════════════════════

@extend_schema(tags=['Categories'])
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Lista de las 12 categorías de servicios (solo lectura)."""
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
    """Etiquetas disponibles para servicios (solo lectura)."""
    queryset           = Tag.objects.all()
    serializer_class   = TagSerializer
    permission_classes = [IsAuthenticated]

    @extend_schema(summary='Listar todas las etiquetas')
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


@extend_schema(tags=['Skills'])
class SkillViewSet(viewsets.ModelViewSet):
    """CRUD de habilidades (solo admins pueden crear/editar/borrar)."""
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


# ══════════════════════════════════════════════════════════
#  SERVICIOS
# ══════════════════════════════════════════════════════════

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
        description='Crea una oferta o solicitud de servicio. El campo `user` se asigna automáticamente.',
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

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
        return TradeSerializer

    def get_queryset(self):
        user = self.request.user
        qs   = Trade.objects.filter(
            Q(offerer=user) | Q(requester=user)
        ).select_related('service__user', 'service__category', 'offerer', 'requester')

        st = self.request.query_params.get('status')
        if st:
            qs = qs.filter(status=st)

        role = self.request.query_params.get('role')
        if role == 'offerer':
            qs = qs.filter(offerer=user)
        elif role == 'requester':
            qs = qs.filter(requester=user)

        return qs.order_by('-created_at')

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
            'Al pasar a **completed** los créditos se transfieren automáticamente '
            'y se actualizan las estadísticas de ambos usuarios.'
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
        description=(
            'Si ya existe una conversación entre los mismos participantes, '
            'la devuelve en lugar de crear una nueva.'
        ),
    ),
)
class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names  = ['get', 'post', 'head', 'options']

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
        responses={
            201: MessageSerializer,
            403: OpenApiResponse(description='No eres participante de esta conversación'),
        },
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
        # Actualiza updated_at de la conversación
        conversation.save()

        return Response(
            MessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        tags=['Conversations'],
        summary='Marcar mensajes como leídos',
        description='Marca todos los mensajes no leídos (de otros) en esta conversación.',
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
        description=(
            'Solo se puede valorar un intercambio en estado `completed`. '
            'Cada participante puede dejar una valoración. '
            'El rating medio del usuario valorado se recalcula automáticamente.'
        ),
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
    """Estadísticas globales de la plataforma. Solo accesible para staff."""
    permission_classes = [IsAdminUser]

    @extend_schema(
        summary='Estadísticas globales de TimeCircle',
        description='Resumen de usuarios, servicios, trades y actividad de los últimos 30 días.',
        responses={
            200: OpenApiResponse(
                description='Estadísticas de la plataforma',
                response={
                    'type': 'object',
                    'properties': {
                        'total_users':               {'type': 'integer'},
                        'active_users_last_30_days': {'type': 'integer'},
                        'total_services':            {'type': 'integer'},
                        'services_by_type':          {'type': 'object'},
                        'total_trades':              {'type': 'integer'},
                        'trades_by_status':          {'type': 'object'},
                        'total_reviews':             {'type': 'integer'},
                        'avg_rating':                {'type': 'number'},
                        'total_hours_exchanged':     {'type': 'integer'},
                        'total_credits_in_system':   {'type': 'integer'},
                    },
                },
            )
        },
    )
    def get(self, request):
        last_30 = timezone.now() - timedelta(days=30)

        stats = {
            'total_users': User.objects.filter(is_active=True).count(),
            'active_users_last_30_days': User.objects.filter(
                last_login__gte=last_30
            ).count(),

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

            'total_hours_exchanged': User.objects.aggregate(
                total=Sum('hours_given')
            )['total'] or 0,
            'total_credits_in_system': User.objects.aggregate(
                total=Sum('credits')
            )['total'] or 0,

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
            OpenApiParameter('search',  OpenApiTypes.STR,  description='Búsqueda por username, email o nombre'),
            OpenApiParameter('is_active', OpenApiTypes.BOOL, description='Filtrar por estado activo/inactivo'),
        ],
    ),
    retrieve=extend_schema(tags=['Admin'], summary='Obtener usuario (Admin)'),
    partial_update=extend_schema(
        tags=['Admin'],
        summary='Modificar usuario (Admin)',
        description='Permite cambiar is_staff, is_active y ajustar créditos.',
    ),
    destroy=extend_schema(
        tags=['Admin'],
        summary='Desactivar usuario (Admin)',
        description='Desactivación lógica (is_active=False). No elimina datos.',
    ),
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
        qs       = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs

    def destroy(self, request, *args, **kwargs):
        """Desactivación lógica en lugar de borrado físico."""
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

    @extend_schema(
        tags=['Admin'],
        summary='Reactivar usuario desactivado (Admin)',
        responses={200: AdminUserSerializer},
    )
    @action(detail=True, methods=['patch'], url_path='activate')
    def activate(self, request, pk=None):
        user           = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response(AdminUserSerializer(user).data)

    @extend_schema(
        tags=['Admin'],
        summary='Estadísticas individuales de un usuario (Admin)',
    )
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
