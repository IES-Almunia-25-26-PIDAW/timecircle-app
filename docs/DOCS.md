# TimeCircle – Docs

<img width="512" height="512" alt="Logo TimeCircle" src="https://github.com/user-attachments/assets/b26b1fa0-bc4c-4b01-a961-715b9eacfd9e" />

# Índice
  - [Variables de Entrono](#variables-de-entorno)
  - [Servicios incluidos](#servicios-incluidos)
    - [Docker Compose](#docker-composeyml)
    - [Dockerfiles](#dockerfiles)
      * [Frontend](#frontend)
        - [🚀 Uso rápido](#-uso-rápido)
        - [🐳 Ejemplo implementación del Frontend con Docker Compose](#-ejemplo-implementación-del-frontend-con-docker-compose)
      * [Backend](#backend)
        - [🚀 Uso rápido](#-uso-rápido-1)
        - [🐳 Ejemplo implementación del backend con Docker Compose](#-ejemplo-implementación-del-backend-con-docker-compose)
        - [Acceder a la aplicación](#acceder-a-la-aplicación)

# Variables de Entorno

Las variables se definen en un archivo `.env` en la raíz del proyecto. Están ordenadas de mayor a menor importancia.

| Variable                          | Tipo      | Descripción                                                                                                             |
|-----------------------------------|-----------|-------------------------------------------------------------------------------------------------------------------------|
| `SECRET_KEY`                      | String    | Llave secreta de Django/JWT. Mínimo 50 caracteres en producción.                                                        |
| `DEBUG`                           | Bool      | Activa el modo debug. Usar `False` en producción.                                                                       |
| `ALLOWED_HOSTS`                   | String[]  | Hosts que pueden acceder al servidor (separados por coma).                                                              |
| `CORS_ALLOWED_ORIGINS`            | String[]  | Orígenes que CORS permite acceder (separados por coma).                                                                 |
| `CORS_ALLOWED_ORIGIN_REGEXES`     | String[]  | Patrones regex de orígenes permitidos por CORS (separados por `\|`). Útil para URLs dinámicas como previews de Vercel.  |
| `DB_NAME`                         | String    | Nombre de la base de datos PostgreSQL.                                                                                  |
| `DB_USER`                         | String    | Usuario de la base de datos.                                                                                            |
| `DB_PASSWORD`                     | String    | Contraseña de la base de datos.                                                                                         |
| `DB_HOST`                         | String    | Host de la base de datos (`db` en Docker, `localhost` en local).                                                        |
| `DB_PORT`                         | String    | Puerto de la base de datos (por defecto `5432`).                                                                        |
| `REDIS_HOST`                      | String    | Host de Redis (`redis` en Docker, `localhost` en local).                                                                |
| `NGINX_PORT`                      | Int       | Puerto del host en el que Nginx estará disponible (por defecto `8080`).                                                 |
| `REDIS_PORT`                      | String    | Puerto de Redis (por defecto `6379`).                                                                                   |
| `VITE_API_URL`                    | String    | Dirección de API Backend, la cual el frontend realizará las llamadas al backend.                                        |

# Servicios incluidos

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

## docker-compose.yml

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
      - ./.env:/app/.env:ro
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

## Dockerfiles

> Los Dockerfiles para montar frontend y backend por separado.

Repositorios de Docker Hub:
- [Backend](https://hub.docker.com/r/xarzy23/timecircle-backend)
- [Frontend](https://hub.docker.com/r/xarzy23/timecircle-frontend)

### Frontend

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

#### 🚀 Uso rápido

```bash
docker run -p 5173:5173 tu-usuario/timecircle-frontend
```

#### 🐳 Ejemplo implementación del Frontend con Docker Compose

```yaml
frontend:
  image: xarzy23/timecircle-frontend
  ports:
    - "5173:5173"
  environment:
    - VITE_API_BASE_URL=http://backend:8000
  depends_on:
    - backend
```

---

### Backend
```dockerfile
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT [ "/app/entrypoint.sh" ]

EXPOSE 8000
```

#### 🚀 Uso rápido

```bash
docker run -p 8000:8000 \
  -e DATABASE_URL=postgres://user:pass@host:5432/timecircle \
  -e SECRET_KEY=tu_secret_key \
  tu-usuario/timecircle-backend
```

#### 🐳 Ejemplo implementación del backend con Docker Compose

```yaml
backend:
  image: xarzy23/timecircle-backend
  ports:
    - "8000:8000"
  environment:
    - SECRET_KEY=supersecretkey
    - DEBUG=True
    - DATABASE_URL=postgres://timecircle:password@db:5432/timecircle
  depends_on:
    - db

db:
  image: postgres:16-alpine
  environment:
    - POSTGRES_DB=timecircle
    - POSTGRES_USER=timecircle
    - POSTGRES_PASSWORD=password
```

> [!TIP]
> Para generar un `SECRET_KEY` válido ejecuta:
> ```bash
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

#### Acceder a la aplicación

| URL                                        | Descripción                        |
|--------------------------------------------|------------------------------------|
| `http://localhost:8080`                    | Aplicación principal (vía Nginx)   |
| `http://localhost:8080/api/`               | API REST Django                    |
| `http://localhost:8080/api/docs/`          | Documentación Swagger              |

> [!NOTE]
> El puerto `8080` es el valor por defecto. Si ya está en uso en tu máquina, cámbialo en el `.env` con `NGINX_PORT` antes de arrancar.