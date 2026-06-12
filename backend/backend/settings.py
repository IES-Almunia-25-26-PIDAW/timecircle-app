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
from dotenv import load_dotenv, find_dotenv

# ── Rutas base ────────────────────────────────────────────
# Ajustamos la búsqueda del .env para funcionar tanto en desarrollo local
# como cuando el código está montado en /app dentro del contenedor.
BASE_DIR = Path(__file__).resolve().parent.parent
# Intentar localizar automáticamente un .env (sube hasta /), y si no se
# encuentra, usar el .env dentro de la carpeta de la app (/app/.env).
env_path = find_dotenv() or (BASE_DIR / ".env")
load_dotenv(env_path, override=True)

# ── Seguridad ─────────────────────────────────────────────
_DEFAULT_SECRET_KEY     = 'django-insecure-CHANGE-ME-in-production'
SECRET_KEY              = os.getenv('SECRET_KEY', _DEFAULT_SECRET_KEY)
DEBUG                   = os.getenv('DEBUG', 'True') == 'True'

if not DEBUG and (not SECRET_KEY or SECRET_KEY == _DEFAULT_SECRET_KEY):
    raise ValueError(
        "Insecure configuration: SECRET_KEY must be set to a unique, non-default value when DEBUG is False."
    )

# --- Cookies seguras ---
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = not DEBUG       # Cookie de sesión solo por HTTPS
CSRF_COOKIE_SECURE    = not DEBUG       # Cookie CSRF solo por HTTPS
SESSION_COOKIE_HTTPONLY = True     # JS no puede leer la cookie de sesión
CSRF_COOKIE_HTTPONLY    = False    # El frontend necesita leer el CSRF token
SESSION_COOKIE_SAMESITE = 'Lax'    # CSRF protection against cross-site requests
CSRF_COOKIE_SAMESITE    = 'Lax'    # CSRF protection against cross-site requests

# --- Protección adicional ---
# Disabled SSL redirect since backend runs behind ALB which handles HTTPS at the edge
SECURE_SSL_REDIRECT         = False   # ALB handles HTTPS termination
SECURE_HSTS_SECONDS         = 0  # Disable HSTS for backend behind ALB
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD         = False
SECURE_CONTENT_TYPE_NOSNIFF = not DEBUG   # Evita que el navegador adivine el MIME type
X_FRAME_OPTIONS             = "DENY" # Previene clickjacking en iframes
X_CONTENT_TYPE_OPTIONS      = "nosniff"
REFERRER_POLICY             = "strict-origin-when-cross-origin"

_raw_allowed_hosts = os.getenv('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = [host.strip() for host in _raw_allowed_hosts.split(',') if host.strip()]

if not DEBUG and not ALLOWED_HOSTS:
    raise ValueError(
        "Insecure configuration: ALLOWED_HOSTS must contain at least one valid host when DEBUG is False."
    )

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
    'channels',

    # Proyecto
    'api',
    'backend'
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
ASGI_APPLICATION = 'backend.asgi.application'

# Channel layer (Redis in production, in-memory fallback for dev)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(os.getenv('REDIS_HOST', 'redis'), int(os.getenv('REDIS_PORT', 6379)))],
        },
    }
}

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
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
        'OPTIONS': {
            'location': str(BASE_DIR / 'media'),
        },
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

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
        'user': '10000/hour',
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
    'UPDATE_LAST_LOGIN': True,
}

# ── CORS ──────────────────────────────────────────────────
# En producción, reemplaza con los dominios reales del frontend
_cors_allowed_origins_env = os.getenv('CORS_ALLOWED_ORIGINS')
if _cors_allowed_origins_env:
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in _cors_allowed_origins_env.split(',')
        if origin.strip()
    ]
elif DEBUG:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
    ]
else:
    raise ValueError(
        "Insecure configuration: CORS_ALLOWED_ORIGINS must be set in production."
    )
# Patrones dinámicos (previews de Vercel)
_raw_regexes = os.getenv('CORS_ALLOWED_ORIGIN_REGEXES', '')
CORS_ALLOWED_ORIGIN_REGEXES = [
    pattern.strip()
    for pattern in _raw_regexes.split('|')
    if pattern.strip()
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


# ── Email / SMTP ────────────────────────────────────────────
# Configurables vía .env. Por defecto en desarrollo usamos el backend
# de consola para no requerir credenciales SMTP.
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', '')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'no-reply@timecircle.app')

