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
  - [Backend](#Backend)
    - [1️⃣ Clonar el repositorio](#1️⃣-Clonar-el-repositorio)
    - [2️⃣ Configurar entorno virtual](#2️⃣-Configurar-entorno-virtual)
    - [3️⃣ Instalar dependencias](#3️⃣-Instalar-dependencias)
    - [4️⃣ Configurar .env](#4️⃣-Configurar-env)
    - [5️⃣ Aplicar migraciones](#5️⃣-Aplicar-migraciones)
    - [6️⃣ Crear datos de prueba](#6️⃣-Crear-datos-de-prueba)
    - [7️⃣ Ejecutar servidor](#7️⃣-Ejecutar-servidor)
  - [Frontend](#Frontend)
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
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

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

 - DEBUG (Bool): Ejecuta el servidor backend en modo debug.
 - ALLOWED_HOSTS (String[]): Lista de direcciones red que tienen acceso al servidor.
 - CORS_ALLOWED_ORIGINS (String[]): Lista de direcciones red que CORS deja acceder.
 - DB_NAME (String): Base de datos a conectarse al servidor.
 - DB_USER (String): Usuario de la base de datos a conectarse al servidor.
 - DB_PASSWORD (String): Contraseña de la base de datos a conectarse al servidor.
 - DB_HOST (String): Dirección de red de la base de datos.
 - DB_PORT (String): Puerto a usar para establecer la conexión hacia la base de datos.
 - SECRET_KEY (String): Llave secreta mayor de 32 caracteres para JWT.

# ⚙️ Instalación y ejecución

## Docker

Simplemente utilice las variables de entorno disponibles para crear un .env en la raíz del proyecto.
Cuando este todo listo, ejecute el composer en la raíz del proyecto.

```bash
docker compose up
```

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

```bash
python backend/manage.py runserver
```

> [!TIP]
> Puedes ejecutar los tests con este comando:
>
> ```bash
> python backend/manage.py test
> ```

> [!WARNING]
> Si tienes un SGBD local, se recomienda utilizar Docker para una mayor portabilidad, aislamiento, escalabilidad y consistencia a la hora de desarrollar. Véase el apartado [Docker](#Docker).

## Frontend

### 1️⃣ Instalar dependencias

```bash
cd frontend/
npm install
```

### 2️⃣ Ejecutar servidor

```bash
npm run dev
```

# 🤝 Autor

**Álex-Guillermo Carpio García @Xarzy**
**_Proyecto TFG · Desarrollo de Aplicaciones Multiplataforma_**
