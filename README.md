# Docker Template – Bun API + Postgres + React (DEV & PROD)

Este repositorio es un **template Dockerizado** para correr:

- **PostgreSQL**
- **API en Bun** (con Drizzle ORM)
- **Frontend React (Vite)**

Soporta **DESARROLLO y PRODUCCIÓN en paralelo** en la misma máquina (por ejemplo, un NAS Synology), usando:

- Docker Compose
- Projects (`-p`) para aislar DEV y PROD
- Profiles para elegir qué servicios levantar
- Archivos `.env` separados
- Hot reload en DEV
- Build optimizado en PROD
- `Makefile` para simplificar comandos

---

## Estructura del proyecto

```text
.
├── docker-compose.yml          # base común
├── docker-compose.prod.yml     # overrides producción
├── docker-compose.dev.yml      # overrides desarrollo
├── .env.prod
├── .env.dev
├── Makefile
│
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── drizzle.config.ts
│   ├── drizzle/                # migraciones persistidas
│   └── src/
│
└── web/
    ├── Dockerfile
    ├── nginx.conf
    ├── vite.config.ts
    └── src/
```

---

## Requisitos

- Docker + Docker Compose v2
- (Recomendado) VS Code + Remote SSH
- `make` disponible en el sistema (o usar comandos docker directamente)

---

## Variables de entorno

### `.env.prod`

```env
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppassword
POSTGRES_DB=appdb
POSTGRES_PORT=5432

API_PORT=3001
WEB_PORT=8080

DATABASE_URL=postgres://appuser:apppassword@postgres:5432/appdb
```

### `.env.dev`

```env
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppassword
POSTGRES_DB=appdb_dev
POSTGRES_PORT=5433

API_PORT=3002
WEB_PORT=5173

DATABASE_URL=postgres://appuser:apppassword@postgres:5432/appdb_dev
```

DEV y PROD **no comparten puertos ni base de datos**.

---

## Conceptos clave

### Projects (`-p`)
Se usan projects distintos para evitar colisiones:

- `template-prod`
- `template-dev`

Cada uno crea:
- redes Docker distintas
- contenedores distintos
- volúmenes distintos

### Profiles
Permiten elegir **qué servicios levantar**:

- `db`
- `api` / `api-dev`
- `web` / `web-dev`

---

## Uso con Makefile (recomendado)

El `Makefile` encapsula todos los comandos largos de Docker Compose.

### Ayuda

```bash
make help
```

---

## Producción (PROD)

### Levantar todo (DB + API + WEB)

```bash
make prod-up
```

### Levantar servicios individuales

```bash
make prod-db-up     # solo Postgres
make prod-api-up    # solo API
make prod-web-up    # solo Web
```

### Ver estado

```bash
make prod-ps
```

### Ver logs

```bash
make prod-logs
```

### Detener PROD

```bash
make prod-down
```

### Accesos PROD

- Web: `http://<IP_DEL_HOST>:8080`
- API directa (si expuesta): `http://<IP_DEL_HOST>:3001/health`
- API vía web: `http://<IP_DEL_HOST>:8080/api/health`

---

## Desarrollo (DEV)

En desarrollo se usan:

- Bun con `--watch`
- Vite dev server con HMR
- Código montado como volumen

### Levantar todo DEV

```bash
make dev-up
```

### Levantar servicios individuales

```bash
make dev-db-up
make dev-api-up
make dev-web-up
```

### Ver estado

```bash
make dev-ps
```

### Ver logs

```bash
make dev-logs
```

### Detener DEV

```bash
make dev-down
```

### Accesos DEV

- Web (Vite): `http://<IP_DEL_HOST>:5173`
- API directa: `http://<IP_DEL_HOST>:3002/health`
- API desde frontend: `/api/*` (proxy Vite)

---

## Migraciones (Drizzle – DEV)

### Generar migración

```bash
make db-generate
```

### Aplicar migraciones

```bash
make db-migrate
```

Las migraciones se guardan en `api/drizzle/` y se aplican automáticamente al iniciar la API.

---

## Uso sin Makefile (alternativo)

Si no tienes `make`, puedes usar directamente Docker Compose.

### PROD

```bash
ENV_FILE=.env.prod docker compose -p template-prod   -f docker-compose.yml -f docker-compose.prod.yml   --profile db --profile api --profile web   up -d --build
```

### DEV

```bash
ENV_FILE=.env.dev docker compose -p template-dev   -f docker-compose.yml -f docker-compose.dev.yml   --profile db --profile api-dev --profile web-dev   up -d --build
```

---

## Desarrollo desde Windows

1. Instalar VS Code
2. Instalar extensión **Remote – SSH**
3. Conectarse al NAS/servidor
4. Abrir la carpeta del proyecto
5. Editar código:
   - Cambios en `api/` → recarga automática
   - Cambios en `web/` → HMR instantáneo

---

## Arquitectura (resumen)

### Producción
```
Browser → Nginx (web) → /api → API (bun) → Postgres
```

### Desarrollo
```
Browser → Vite (5173) → /api → API (bun) → Postgres
```

El frontend **nunca conoce el puerto real de la API**.

---

## Principios del template

- DEV y PROD completamente aislados
- Sin CORS (proxy)
- Sin URLs hardcodeadas
- Migraciones persistidas
- Reproducible y seguro

---

## Comandos rápidos

```bash
make prod-up
make dev-up
make prod-down
make dev-down
make db-generate
```

---

Este README describe el flujo completo para usar el template de forma segura y profesional.
