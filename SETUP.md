# GenMail — Setup Local Completo

## Pre-requisitos

- **Docker Desktop** corriendo
- **Node.js 20+** y **pnpm 9+** (`npm install -g pnpm@9`)
- **Git**

## 1. Configurar variables de entorno

El archivo `.env` ya fue creado en la raíz con valores por defecto. **Edítalo para añadir al menos**:

```env
OPENAI_API_KEY=sk-...   # REQUERIDO para el AI service
NEXTAUTH_SECRET=...     # Genera uno con: openssl rand -base64 32
```

Otras claves (Stripe, Google OAuth, Resend) son **opcionales** — la app arranca sin ellas:
- Sin Stripe: el endpoint `/api/billing/*` responde 500, pero el resto funciona
- Sin Google OAuth: solo se usa magic link por email (Resend)
- Sin Resend: en `NODE_ENV=development` se activa un **DEV credentials login** (solo email, sin password) — perfecto para probar

## 2. Instalar dependencias y generar Prisma client

```cmd
pnpm install
cd packages\db
pnpm exec prisma generate
cd ..\..
```

## 3. Arrancar infraestructura Docker

Esto levanta **postgres + redis + ai-service + listmonk + worker**. El worker:
- Espera a que postgres esté listo
- Activa la extensión `pgvector`
- Aplica el schema con `prisma db push` (idempotente)
- Hace seed de los sectores
- Arranca los workers de BullMQ

```cmd
docker-compose -f infra/docker-compose.yml build --no-cache
docker-compose -f infra/docker-compose.yml up -d
docker-compose -f infra/docker-compose.yml logs -f worker
```

Logs esperados del worker:
```
[Entrypoint] Postgres is ready.
[Entrypoint] pgvector extension ready.
[Entrypoint] Prisma schema applied.
[Entrypoint] Seeding sector knowledge...
[Entrypoint] Starting worker...
✓ Sequence worker started (concurrency: 1)
✓ Email worker started (concurrency: 5)
...
[Main] All systems operational! Waiting for jobs...
```

## 4. Arrancar el web app (Next.js)

El web app corre **fuera de Docker** para iteración rápida:

```cmd
cd apps\web
pnpm dev
```

Abrir **http://localhost:3000**.

## 5. Login de prueba (sin OAuth)

Si no configuraste Google/Resend, el dev credentials login está activo:

1. Ve a `/login`
2. NextAuth mostrará un formulario "Dev Login" con un campo email
3. Ingresa cualquier email (e.g. `test@example.com`)
4. Se crea automáticamente: User + Business + onboarding pendiente
5. Te redirige a `/onboarding` para completar el wizard
6. Después accedes al dashboard

## 6. Verificar servicios

| Servicio | URL | Status |
|----------|-----|--------|
| Web app | http://localhost:3000 | `pnpm dev` |
| AI service | http://localhost:8000/health | docker |
| Listmonk | http://localhost:9000 | docker (admin/admin) |
| Postgres | localhost:5432 | docker |
| Redis | localhost:6379 | docker |

## Troubleshooting

### "DATABASE_URL is not set" en el web app

El `.env` está en la raíz. Next.js lo lee automáticamente desde `apps/web` gracias a la búsqueda hacia arriba. Si no, copia el `.env` también a `apps/web/.env.local`.

### Worker reinicia infinito

Mira los logs con `docker-compose logs worker`. Lo más común:
- Postgres aún no listo → reintenta solo
- Schema con error → revisa logs del `prisma db push`
- pgvector no disponible → revisa que la imagen es `pgvector/pgvector:pg16`

### "PrismaClient was not initialized"

Falta `pnpm exec prisma generate` localmente:
```cmd
cd packages\db
pnpm exec prisma generate
```

### Cambios al schema.prisma

Si modificas el schema:
```cmd
cd packages\db
pnpm exec prisma format
pnpm exec prisma generate
cd ..\..
docker-compose -f infra/docker-compose.yml restart worker
```

El worker re-aplicará el schema automáticamente al reiniciar.

### Reset total de la DB

```cmd
docker-compose -f infra/docker-compose.yml down -v
docker-compose -f infra/docker-compose.yml up -d
```

## Variables de entorno por servicio

| Variable | Requerido | Default | Notas |
|----------|-----------|---------|-------|
| `OPENAI_API_KEY` | ✅ AI | — | sin esto, AI service falla |
| `NEXTAUTH_SECRET` | ✅ Web | — | mín 32 chars |
| `NEXTAUTH_URL` | ✅ Web | http://localhost:3000 | |
| `DATABASE_URL` | ✅ All | postgres en docker | |
| `REDIS_URL` | ✅ All | redis en docker | |
| `AI_SERVICE_URL` | ✅ Worker/Web | http://ai-service:8000 (docker) o http://localhost:8000 | |
| `STRIPE_SECRET_KEY` | ⚪ Web | — | billing si no se setea |
| `GOOGLE_CLIENT_ID/SECRET` | ⚪ Web | — | OAuth opcional |
| `RESEND_API_KEY` | ⚪ Web | — | magic link opcional |
| `APOLLO_API_KEY` | ⚪ Worker | — | mock mode si vacío |
| `HUNTER_API_KEY` | ⚪ Worker | — | mock mode si vacío |
| `GOOGLE_PLACES_API_KEY` | ⚪ Worker | — | mock mode si vacío |
| `LISTMONK_*` | ⚪ Worker | admin/admin (docker) | |
