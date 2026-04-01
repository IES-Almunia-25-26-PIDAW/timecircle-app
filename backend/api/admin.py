from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (
    User, Category, Tag, Skill, UserSkill,
    Service, Trade, Transaction,
    Conversation, Message, Review, ContactMessage
)


# ── User ─────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = [
        'username', 'email', 'get_full_name',
        'credits', 'rating', 'completed_trades', 'badge', 'is_active', 'is_staff',
    ]
    list_filter   = ['badge', 'is_active', 'is_staff', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'location']
    ordering      = ['-date_joined']

    fieldsets = BaseUserAdmin.fieldsets + (
        (_('Perfil TimeCircle'), {
            'fields': ('avatar', 'bio', 'location'),
        }),
        (_('Economía de créditos'), {
            'fields': ('credits', 'hours_given', 'hours_received'),
        }),
        (_('Estadísticas'), {
            'fields': ('rating', 'total_reviews', 'completed_trades', 'badge'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ['rating', 'total_reviews', 'completed_trades', 'badge', 'date_joined', 'last_login']


# ── Categorías / Tags / Habilidades ─────────────────────

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ['name', 'icon', 'description']
    search_fields = ['name']


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display  = ['name']
    search_fields = ['name']


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display  = ['name', 'description']
    search_fields = ['name']


@admin.register(UserSkill)
class UserSkillAdmin(admin.ModelAdmin):
    list_display  = ['user', 'skill']
    search_fields = ['user__username', 'skill__name']
    list_filter   = ['skill']


# ── Servicios ────────────────────────────────────────────

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display   = ['title', 'user', 'type', 'category', 'credits', 'duration', 'status', 'created_at']
    list_filter    = ['type', 'status', 'category']
    search_fields  = ['title', 'description', 'user__username']
    list_editable  = ['status']
    date_hierarchy = 'created_at'
    raw_id_fields  = ['user', 'category']
    filter_horizontal = ['tags']


# ── Intercambios ─────────────────────────────────────────

@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display   = [
        'id', 'service', 'offerer', 'requester',
        'status', 'credits_amount', 'scheduled_date', 'created_at', 'completed_at',
    ]
    list_filter    = ['status']
    search_fields  = ['offerer__username', 'requester__username', 'service__title']
    date_hierarchy = 'created_at'
    raw_id_fields  = ['service', 'offerer', 'requester']
    readonly_fields = ['created_at', 'completed_at']


# ── Transacciones ────────────────────────────────────────

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display  = ['user', 'trade', 'amount', 'transaction_type', 'created_at']
    list_filter   = ['transaction_type']
    search_fields = ['user__username']
    readonly_fields = ['user', 'trade', 'amount', 'transaction_type', 'created_at']

    def has_add_permission(self, request):
        # Las transacciones se crean programáticamente, no desde el admin
        return False

    def has_change_permission(self, request, obj=None):
        return False


# ── Mensajería ───────────────────────────────────────────

class MessageInline(admin.TabularInline):
    model       = Message
    extra       = 0
    readonly_fields = ['sender', 'content', 'timestamp', 'read']
    can_delete  = False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_participants', 'created_at', 'updated_at']
    inlines      = [MessageInline]
    filter_horizontal = ['participants']

    def get_participants(self, obj):
        return ', '.join(p.username for p in obj.participants.all())
    get_participants.short_description = 'Participantes'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display  = ['sender', 'conversation', 'content', 'timestamp', 'read']
    list_filter   = ['read']
    search_fields = ['sender__username', 'content']
    date_hierarchy = 'timestamp'


# ── Reseñas ──────────────────────────────────────────────

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display   = ['reviewer', 'reviewee', 'rating', 'trade', 'created_at']
    list_filter    = ['rating']
    search_fields  = ['reviewer__username', 'reviewee__username', 'comment']
    date_hierarchy = 'created_at'
    raw_id_fields  = ['reviewer', 'reviewee', 'trade']
    readonly_fields = ['created_at']

# Contacto

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display  = ['name', 'email', 'reason', 'read', 'created_at']
    list_filter   = ['reason', 'read', 'created_at']
    search_fields = ['name', 'email', 'message']
    list_editable = ['read']
    readonly_fields = ['name', 'email', 'reason', 'message', 'created_at']
    date_hierarchy = 'created_at'
 
    def has_add_permission(self, request):
        return False  # Solo se crean desde el formulario público