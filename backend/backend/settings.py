"""
Django settings para TimeCircle.

Cambios respecto a la configuración original:
  - AUTH_USER_MODEL apunta al modelo extendido en 'api'
  - Se añaden: corsheaders, rest_framework_simplejwt y su token_blacklist
  - SIMPLE_JWT configura tokens de 60 min (access) y 7 días (refresh)
  - CORS_ALLOWED_ORIGINS permite el frontend en localhost:3000 y :5173
  - MEDIA_FILES para avatares (si se cambia URLField por ImageField en el futuro)
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv

# ── Rutas base ────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

# ── Seguridad ─────────────────────────────────────────────
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-CHANGE-ME-in-production')
DEBUG      = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'backend', '172.20.0.1']

# ── Redis ─────────────────────────────────────────────────
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")

# ── Aplicaciones ──────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Terceros
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',   # Necesario para logout con blacklist
    'drf_spectacular',
    'corsheaders',

    # Proyecto
    'api',
]

# ── Middleware ────────────────────────────────────────────
# IMPORTANTE: CorsMiddleware debe ir ANTES de CommonMiddleware
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.middleware.ResponseTimeMiddleware'
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS':    [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# ── Base de datos ─────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.postgresql',
        'NAME':     os.getenv('DB_NAME',     'timecircledb'),
        'USER':     os.getenv('DB_USER',     'timecircledbuser'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'timecircledbpass'),
        'HOST':     os.getenv('DB_HOST',     'localhost'),
        'PORT':     os.getenv('DB_PORT',     '5432'),
    }
}

# ── Validación de contraseñas ─────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internacionalización ──────────────────────────────────
LANGUAGE_CODE = 'es-es'
TIME_ZONE     = 'Europe/Madrid'
USE_I18N      = True
USE_TZ        = True

# ── Archivos estáticos y media ────────────────────────────
STATIC_URL  = 'static/'
STATIC_ROOT = BASE_DIR / 'static'

MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ── PK por defecto ────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Modelo de usuario personalizado ──────────────────────
AUTH_USER_MODEL = 'api.User'

# ── Django REST Framework ─────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',

    # Paginación global (opcional; se puede sobreescribir por ViewSet)
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,

    # Throttling básico (anti-spam)
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
    },
}

# ── SimpleJWT ─────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ── CORS ──────────────────────────────────────────────────
# En producción, reemplaza con los dominios reales del frontend
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',   # React (CRA / Vite)
    'http://localhost:5173',   # Vite
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
]
CORS_ALLOW_CREDENTIALS = True

# ── drf-spectacular (Swagger / OpenAPI) ───────────────────
SPECTACULAR_SETTINGS = {
    'TITLE':       'TimeCircle API',
    'DESCRIPTION': (
        'API REST para el banco de tiempo comunitario TimeCircle.\n\n'
        '**Autenticación:** Bearer JWT. Usa `/api/auth/login/` para obtener '
        'los tokens y añade la cabecera `Authorization: Bearer <access_token>` '
        'en todas las peticiones protegidas.\n\n'
        '**Flujo de intercambio:**\n'
        '`pending` → `accepted` → `in_progress` → `completed`\n\n'
        'Al completarse, los créditos se transfieren automáticamente.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,

    # Seguridad Bearer JWT en Swagger UI
    'SECURITY': [{'bearerAuth': []}],
    'COMPONENTS': {
        'securitySchemes': {
            'bearerAuth': {
                'type':         'http',
                'scheme':       'bearer',
                'bearerFormat': 'JWT',
            }
        }
    },

    # Ordenar tags en la UI
    'TAGS': [
        {'name': 'Auth',          'description': 'Registro, login, logout y perfil propio'},
        {'name': 'Users',         'description': 'Gestión de perfiles y ranking'},
        {'name': 'Categories',    'description': 'Las 12 categorías de servicios'},
        {'name': 'Tags',          'description': 'Etiquetas de servicios'},
        {'name': 'Skills',        'description': 'Habilidades de usuarios'},
        {'name': 'Services',      'description': 'Ofertas y solicitudes de servicios'},
        {'name': 'Trades',        'description': 'Intercambios y flujo de estados'},
        {'name': 'Conversations', 'description': 'Mensajería entre usuarios'},
        {'name': 'Reviews',       'description': 'Valoraciones tras intercambios'},
        {'name': 'Admin',         'description': 'Panel de administración (solo staff)'},
    ],
    'SWAGGER_UI_SETTINGS': {
        'displayRequestDuration': True,
    }
}
