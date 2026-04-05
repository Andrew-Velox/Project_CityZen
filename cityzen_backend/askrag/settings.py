
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-ili7lgje!gw6y6y717*@p6ptj_t4_5c(hxu1uaw7tb$=*zdha6'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "True") == "True"

ALLOWED_HOSTS = ["*"]
CSRF_TRUSTED_ORIGINS = [
    # 'https://my-django-template.onrender.com',
    'https://*.127.0.0.1',

    ]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    "drf_spectacular",
    'corsheaders',
    'rest_framework',
    'rest_framework.authtoken',
    'django_filters',


    'rag_service',
    'rag_user',
    'rag_blog',

]



MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    'corsheaders.middleware.CorsMiddleware',
]

ROOT_URLCONF = 'askrag.urls'

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    
    "http://127.0.0.1:3000",
]

CORS_ORIGIN_ALLOW_ALL = True



TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'askrag.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATIC_URL = '/static/'
MEDIA_ROOT = os.path.join(BASE_DIR, "media")
MEDIA_URL = '/media/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'rag_user.CustomUser'

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
}

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',

        # 'rest_framework.authentication.TokenAuthentication',
        # 'rest_framework.authentication.SessionAuthentication',
    ],
}


SPECTACULAR_SETTINGS = {
    'TITLE': 'My Project APIs',
    'DESCRIPTION': 'My RAG API for document processing, vector search, and question answering.',
    'VERSION': '1.0.0',

    # Show schema endpoint inside Swagger
    'SERVE_INCLUDE_SCHEMA': False,

    # Authentication setup
    'SECURITY_DEFINITIONS': {
        'BearerAuth': {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
            'description': 'Enter your JWT token as: **Bearer <token>**',
        },
    },

    # UI options
    'USE_SESSION_AUTH': False,
    'JSON_EDITOR': True,

    # Optional extra info
    'SERVERS': [
        {'url': 'https://my-django-template.onrender.com', 'description': 'Production server'},
        {'url': 'http://127.0.0.1:8000', 'description': 'Local development'},
    ],

    "SWAGGER_UI_SETTINGS": {
        "persistAuthorization": True,  # keeps token after refresh
    },

    # Optional: tag-based grouping
    # 'TAGS': [
    #     {'name': 'Auth', 'description': 'Authentication and user APIs'},
    #     {'name': 'Files', 'description': 'Document upload and retrieval APIs'},
    #     {'name': 'RAG', 'description': 'Query and response generation endpoints'},
    # ],
}



# Email Configuration
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")

# Gmail SMTP Configuration
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "465"))  # Try 465 if 587 doesn't work
EMAIL_USE_TLS = os.getenv("EMAIL_PORT", "587") == "587"
EMAIL_USE_SSL = os.getenv("EMAIL_PORT", "587") == "465"
EMAIL_HOST_USER = os.getenv("EMAIL")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_PASSWORD")
DEFAULT_FROM_EMAIL = os.getenv("EMAIL")
EMAIL_TIMEOUT = 10  # seconds