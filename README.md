[![Django CI](https://github.com/IES-Almunia-25-26-PIDAW/timecircle-app/actions/workflows/django.yml/badge.svg)](https://github.com/IES-Almunia-25-26-PIDAW/timecircle-app/actions/workflows/django.yml)
[![CodeQL](https://github.com/IES-Almunia-25-26-PIDAW/timecircle-app/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/IES-Almunia-25-26-PIDAW/timecircle-app/actions/workflows/github-code-scanning/codeql)

# TimeCircle – Banco de Tiempo

<img width="1024" height="1024" alt="ChatGPT Image 11 dic 2025, 18_23_33" src="https://github.com/user-attachments/assets/b26b1fa0-bc4c-4b01-a961-715b9eacfd9e" />

#### Proyecto TFG DAM · Aplicación Web Full-Stack

# Índice
  - [📌 Descripción del Proyecto](#📌-Descripción-del-Proyecto)
  - [🎯 Objetivo](#🎯-Objetivo)
  - [🚀 Características principales](#🚀-Características-principales)
  - [🛠️ Tecnologías utilizadas](#🛠️-Tecnologías-utilizadas)
    - [Frontend](#Frontend)
    - [Backend](#Backend)
    - [Base de datos](#Base-de-datos)
    - [Autenticación](#Autenticación)
    - [Documentación API](#Documentación-API)
    - [Despliegue](#Despliegue)
    - [Versionado](#Versionado)
    - [CI/CD](#CICD)
- [Variables de entorno](#Variables-de-entorno)
- [⚙️ Instalación y ejecución](#⚙️-Instalación-y-ejecución)
  - [Docker](#Docker)
    - [Servicios incluidos](#Servicios-incluidos)
    - [docker-compose.yml](#docker-composeyml)
    - [Paso a paso](#Paso-a-paso)
  - [Backend](#Backend-1)
    - [1️⃣ Clonar el repositorio](#1️⃣-Clonar-el-repositorio)
    - [2️⃣ Configurar entorno virtual](#2️⃣-Configurar-entorno-virtual)
    - [3️⃣ Instalar dependencias](#3️⃣-Instalar-dependencias)
    - [4️⃣ Configurar .env](#4️⃣-Configurar-env)
    - [5️⃣ Aplicar migraciones](#5️⃣-Aplicar-migraciones)
    - [6️⃣ Crear datos de prueba](#6️⃣-Crear-datos-de-prueba)
    - [7️⃣ Ejecutar servidor](#7️⃣-Ejecutar-servidor)
  - [Frontend](#Frontend-1)
    - [1️⃣ Instalar dependencias](#1️⃣-Instalar-dependencias)
    - [2️⃣ Ejecutar servidor](#2️⃣-Ejecutar-servidor)
- [🤝 Autor](#🤝-Autor)

## 📌 Descripción del Proyecto

TimeCircle es una aplicación que reúne a los vecinos de una localidad para intercambiar
favores entre unos y otros, generar una comunidad, sociedad y hacer que los más
pequeños aprendan a compartir e intercambiar favores.

## 🎯 Objetivo

El objetivo del proyecto es facilitar la colaboración entre usuarios, mejorar la organización de servicios y asegurar una experiencia sencilla, segura y transparente.

## 🚀 Características principales

- Registro, login y gestión de perfil.
- Marcadores de los más solidarios y mucho más.
- Sistema de ofertas y solicitudes de servicios.
- Sistema de mensajes y valoraciones entre usuarios.
- Gestión de créditos horarios.
- Panel de administración básico.
- Sistema de reservas e intercambios (Trades).
- Valoraciones entre usuarios tras cada intercambio.
- Panel de seguimiento del historial del usuario.

> [!IMPORTANT]
> 💰 Economía basada en créditos, sin uso de dinero real.

## 🛠️ Tecnologías utilizadas

### Frontend

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white&style=for-the-badge)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000&style=for-the-badge)

### Backend

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)
![Django REST Framework](https://img.shields.io/badge/DRF-ff1709?style=for-the-badge&logo=django&logoColor=white)

### Base de datos

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

### Autenticación

![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

### Documentación API

![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![DRF Spectacular](https://img.shields.io/badge/DRF_Spectacular-1f6feb?style=for-the-badge)

### Despliegue

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

### Versionado

![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

### CI/CD

![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

> [!NOTE]
> No incluye:
>
> - Integración con redes sociales.
> - Aplicación móvil nativa (solo version web responsive).

# Variables de entorno

Las variables se definen en un archivo `.env` en la raíz del proyecto. Están ordenadas de mayor a menor importancia.

| Variable                | Tipo      | Descripción                                                               |
|-------------------------|-----------|---------------------------------------------------------------------------|
| `SECRET_KEY`            | String    | Llave secreta de Django/JWT. Mínimo 50 caracteres en producción.          |
| `DEBUG`                 | Bool      | Activa el modo debug. Usar `False` en producción.                         |
| `ALLOWED_HOSTS`         | String[]  | Hosts que pueden acceder al servidor (separados por coma).                |
| `CORS_ALLOWED_ORIGINS`  | String[]  | Orígenes que CORS permite acceder (separados por coma).                   |
| `DB_NAME`               | String    | Nombre de la base de datos PostgreSQL.                                    |
| `DB_USER`               | String    | Usuario de la base de datos.                                              |
| `DB_PASSWORD`           | String    | Contraseña de la base de datos.                                           |
| `DB_HOST`               | String    | Host de la base de datos (`db` en Docker, `localhost` en local).          |
| `DB_PORT`               | String    | Puerto de la base de datos (por defecto `5432`).                          |
| `REDIS_HOST`            | String    | Host de Redis (`redis` en Docker, `localhost` en local).                  |
| `REDIS_PORT`            | String    | Puerto de Redis (por defecto `6379`).                                     |
| `NGINX_PORT`            | Int       | Puerto del host en el que Nginx estará disponible (por defecto `8080`).   |
| `SECURE_SSL_REDIRECT`   | Bool      | Redirige HTTP → HTTPS. Solo `True` en producción.                         |
| `SESSION_COOKIE_SECURE` | Bool      | Cookie de sesión solo por HTTPS. Solo `True` en producción.               |
| `CSRF_COOKIE_SECURE`    | Bool      | Cookie CSRF solo por HTTPS. Solo `True` en producción.                    |
| `SECURE_HSTS_SECONDS`   | Int       | Tiempo en segundos de HSTS. `0` en desarrollo, `31536000` en producción.  |

# ⚙️ Instalación y ejecución

## Docker

> [!TIP]
> Esta es la forma **recomendada** de ejecutar el proyecto. Docker garantiza portabilidad, aislamiento y consistencia entre entornos.

### Servicios incluidos

El `docker-compose.yml` levanta los siguientes contenedores:

| Servicio    | Imagen            | Puerto en host           | Descripción                         |
|-------------|-------------------|--------------------------|-------------------------------------|
| `db`        | `postgres:alpine` | —                        | Base de datos PostgreSQL (interno)  |
| `redis`     | `redis:7-alpine`  | —                        | Caché y broker de mensajes (interno)|
| `backend`   | Dockerfile local  | —                        | API Django REST (interno)           |
| `frontend`  | Dockerfile local  | —                        | App React / Vite (interno)          |
| `nginx`     | `nginx:alpine`    | `NGINX_PORT` (def. 8080) | Proxy inverso · punto de entrada    |
> [!NOTE]
> El backend y la base de datos incluyen **healthchecks** automáticos. El backend no arrancará hasta que PostgreSQL y Redis estén listos.
> [!NOTE]
> Solo Nginx exponen puertos al host. El backend y el frontend se comunican exclusivamente a través de la red interna `timecircle_net`, lo que reduce la superficie de ataque y evita conflictos con servicios como Apache o Nginx ya instalados en la máquina.

### docker-compose.yml

```yaml
services:
  db:
    image: postgres:alpine
    container_name: timecircle_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - timecircle_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: timecircle_redis
    restart: unless-stopped
    networks:
      - timecircle_net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: timecircle_backend
    restart: unless-stopped
    volumes:
      - ./backend:/app
      - static_files:/app/static
    env_file:
      - ./.env
    environment:
      - SECURE_SSL_REDIRECT=False
      - SESSION_COOKIE_SECURE=False
      - CSRF_COOKIE_SECURE=False
      - SECURE_HSTS_SECONDS=0
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - timecircle_net

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: timecircle_frontend
    restart: unless-stopped
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - timecircle_net

  nginx:
    image: nginx:alpine
    container_name: timecircle_nginx
    restart: unless-stopped
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - static_files:/app/static:ro
    ports:
      - "${NGINX_PORT:-8080}:80"
    depends_on:
      - frontend
      - backend
    networks:
      - timecircle_net

volumes:
  postgres_data:
  static_files:

networks:
  timecircle_net:
    driver: bridge
```

### Paso a paso

**1️⃣ Clonar el repositorio**

```bash
git clone https://github.com/IES-Almunia-25-26-PIDAW/timecircle-app
cd timecircle-app
```

**2️⃣ Crear el archivo `.env`**

Copia el archivo de ejemplo y rellena tus valores:

```bash
cp .env.example .env
```

El `.env` debe quedar en la **raíz del proyecto** (junto al `docker-compose.yml`):

```
timecircle-app/
├── .env               ← aquí
├── docker-compose.yml
├── backend/
└── frontend/
```

> [!TIP]
> Para generar un `SECRET_KEY` válido ejecuta:
> ```bash
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

**3️⃣ Construir y levantar todos los servicios**

```bash
docker compose up --build
```

Para ejecutarlo en segundo plano (detached):

```bash
docker compose up --build -d
```

**4️⃣ Aplicar migraciones y cargar datos de prueba**

En una terminal separada (con los contenedores ya en marcha):

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_categories
docker compose exec backend python manage.py seed_demo_data
```

**5️⃣ Acceder a la aplicación**

| URL                                        | Descripción                        |
|--------------------------------------------|------------------------------------|
| `http://localhost:8080`                    | Aplicación principal (vía Nginx)   |
| `http://localhost:8080/api/`               | API REST Django                    |
| `http://localhost:8080/api/docs/`          | Documentación Swagger              |

> [!NOTE]
> El puerto `8080` es el valor por defecto. Si ya está en uso en tu máquina, cámbialo en el `.env` con `NGINX_PORT` antes de arrancar.

**6️⃣ Parar los servicios**

```bash
docker compose down
```

Para también eliminar los volúmenes (base de datos incluida):

```bash
docker compose down -v
```

> [!WARNING]
> El flag `-v` **borra todos los datos** de PostgreSQL. Úsalo solo si quieres un entorno limpio.

---

## Backend

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/IES-Almunia-25-26-PIDAW/timecircle-app
cd timecircle
```

### 2️⃣ Configurar entorno virtual

```bash
python -m venv venv
source venv/bin/activate     # Linux / Mac
.\venv\Scripts\activate      # Windows
```

### 3️⃣ Instalar dependencias

```bash
pip install -r backend/requirements.txt
```

### 4️⃣ Configurar .env

Crearás un .env en la raíz del proyecto con los datos por ejemplo del .env.example.

### 5️⃣ Aplicar migraciones

```bash
python backend/manage.py migrate
```

### 6️⃣ Crear datos de prueba

```bash
python backend/manage.py seed_categories
python backend/manage.py seed_demo_data
```

### 7️⃣ Ejecutar servidor

Para desarrollo:

```bash
python backend/manage.py runserver
```

Para producción:

```bash
gunicorn backend.wsgi:application --bind 0.0.0.0:8000
```

> [!TIP]
> Puedes ejecutar los tests con este comando:
>
> ```bash
> pytest --cov=. --cov-report=term-missing --cov-fail-under=80 --cov-config=.coveragerc
> ```

> [!WARNING]
> Si tienes un SGBD local, se recomienda utilizar Docker para una mayor portabilidad, aislamiento, escalabilidad y consistencia a la hora de desarrollar. Véase el apartado [Docker](#Docker).

## Frontend

### 1️⃣ Instalar dependencias

```bash
cd frontend/
npm install
```

### 2️⃣ Configurar .env

Crea un archivo `.env` dentro de `frontend/` con la URL de la API:

```dotenv
VITE_API_URL=http://localhost:8080
```

> [!NOTE]
> Si cambiaste `NGINX_PORT` en el `.env` raíz, actualiza también este valor para que coincidan.


### 3️⃣ Ejecutar servidor

```bash
npm run dev
```

# 🤝 Autor

**Álex-Guillermo Carpio García @Xarzy**
**_Proyecto TFG · Desarrollo de Aplicaciones Multiplataforma_**