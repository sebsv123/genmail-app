# GenMail - Arquitectura & Deployment Guide

## 1. Diagrama de Arquitectura

```
                              ┌─────────────────────────────────────────────────────────────┐
                              │                         USUARIO                             │
                              └─────────────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                               VERCEL (Frontend)                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                      Next.js 15 App                                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │   Login      │  │  Dashboard   │  │    Leads     │  │  Sequences   │  │   Settings   │    │   │
│  │  │  (NextAuth)  │  │  (Analytics) │  │   (CRUD)     │  │  (Builder)   │  │  (Config)    │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  │                                    ┌───────────────────────────────────────┐                 │   │
│  │                                    │   API Routes (Next.js Server Actions)  │                 │   │
│  │                                    │  ┌──────────┐ ┌──────────┐ ┌──────────┐│                 │   │
│  │                                    │  │ /leads   │ │ /sequences│ │ /generate││                 │   │
│  │                                    │  └──────────┘ └──────────┘ └──────────┘│                 │   │
│  │                                    └───────────────────────────────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                          │ HTTPS
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              VPS (Backend)                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                      Nginx (SSL/TLS)                                           │   │
│  │                              Routes: ai.genmail.app, mail.genmail.app                        │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                              │                           │                           │
│                              ┌───────────────┘                           └───────────────┐           │
│                              ▼                                           ▼               │           │
│  ┌─────────────────────────────────────┐      ┌─────────────────────────────────────┐  │           │
│  │       AI Service (Python/FastAPI)   │      │       Listmonk (Email Service)      │  │           │
│  │  ┌───────────────────────────────┐   │      │  ┌───────────────────────────────┐  │  │           │
│  │  │  POST /generate-email       │   │      │  │  Send Emails                  │  │  │           │
│  │  │  POST /generate-cold-email  │   │      │  │  Manage Subscribers             │  │  │           │
│  │  │  POST /extract-brand-voice  │   │      │  │  Campaigns                      │  │  │           │
│  │  │  GET  /health               │   │      │  │  Webhooks (Analytics)          │  │  │           │
│  │  └───────────────────────────────┘   │      │  └───────────────────────────────┘  │  │           │
│  │         Port: 8000                   │      │         Port: 9000                  │  │           │
│  └─────────────────────────────────────┘      └─────────────────────────────────────┘  │           │
│                                              │                           │               │           │
│  ┌───────────────────────────────────────────┴───────────────────────────────────────┐  │           │
│  │                                     WORKER (Node.js)                                │  │           │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │           │
│  │  │  Sequence    │  │   Email      │  │    Hunt      │  │        Redis             │ │  │           │
│  │  │  Worker      │  │   Worker     │  │   Worker     │  │      (BullMQ)            │ │  │           │
│  │  │  (Every 5min)│  │  (Concurrent)│  │   (2 workers)│  │    ┌──────────────┐      │ │  │           │
│  │  │              │  │     5        │  │              │  │    │email-sending │      │ │  │           │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │    │sequence-proc  │      │ │  │           │
│  │                                                      │    │lead-hunting   │      │ │  │           │
│  │  ┌──────────────────────────────────────────────┐   │    └──────────────┘      │ │  │           │
│  │  │          AI Client (HTTP to AI Service)      │   │                           │ │  │           │
│  │  │          Listmonk Client (Email Engine)      │   │                           │ │  │           │
│  │  │          Prisma ORM (Database)               │   │                           │ │  │           │
│  │  └──────────────────────────────────────────────┘   └───────────────────────────┘  │           │
│  └──────────────────────────────────────────────────────────────────────────────────────┘           │
│                                              │                                                       │
│  ┌───────────────────────────────────────────┴───────────────────────────────────────────────┐       │
│  │                                     PostgreSQL 16 + pgvector                                │       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │       │
│  │  │   Users      │  │   Leads      │  │  Sequences   │  │  Generated   │  │  Analytics   │  │       │
│  │  │   Businesses │  │   Prospects  │  │  ICPs        │  │  Emails      │  │  Events      │  │       │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │       │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Requisitos Mínimos del VPS

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| vCPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| SSD | 50 GB | 100 GB |
| Red | 100 Mbps | 1 Gbps |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

## 3. Dominios Necesarios

| Dominio | Servicio | Plataforma | SSL |
|---------|----------|------------|-----|
| app.genmail.app | Next.js Frontend | Vercel | Auto (Let's Encrypt) |
| ai.genmail.app | AI Service (FastAPI) | VPS + Nginx | Let's Encrypt |
| mail.genmail.app | Listmonk | VPS + Nginx | Let's Encrypt |

## 4. Pasos de Deploy Inicial

### Paso 1: Preparar VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/sebsv123/genmail-app/main/infra/scripts/setup-vps.sh | bash

# Or manually:
git clone https://github.com/sebsv123/genmail-app.git /opt/genmail
cd /opt/genmail

# Edit environment variables
nano .env.production
```

### Paso 2: Configurar Variables de Entorno

```bash
# Copy template
cp .env.production.example .env.production

# Edit with your values
nano .env.production

# Required variables:
# - DATABASE_URL (PostgreSQL)
# - REDIS_URL (Redis)
# - NEXTAUTH_SECRET (openssl rand -base64 32)
# - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
# - OPENAI_API_KEY
# - NEXTAUTH_URL=https://app.genmail.app
```

### Paso 3: Iniciar Servicios

```bash
cd /opt/genmail

# Build and start all services
docker compose -f infra/docker-compose.prod.yml up -d

# Wait for services to be healthy (30s)
sleep 30

# Run database migrations
docker compose -f infra/docker-compose.prod.yml run --rm worker \
    npx prisma migrate deploy --schema=/app/packages/db/prisma/schema.prisma

# Setup Listmonk (initial setup)
# Visit https://mail.genmail.app and complete setup wizard
```

### Paso 4: Configurar SSL

```bash
# Obtain SSL certificates
certbot --nginx -d ai.genmail.app -d mail.genmail.app --agree-tos --non-interactive -m admin@genmail.app

# Verify auto-renewal
certbot renew --dry-run
```

### Paso 5: Configurar Vercel

```bash
# In project root, link to Vercel
pnpm dlx vercel@latest --prod

# Or setup via GitHub integration:
# 1. Import project in Vercel dashboard
# 2. Root Directory: apps/web
# 3. Build Command: cd ../.. && pnpm turbo run build --filter=web
# 4. Output Directory: apps/web/.next
# 5. Install Command: pnpm install --frozen-lockfile
```

### Paso 6: Configurar Secrets en Vercel

```bash
# Add environment variables to Vercel
vercel env add NEXTAUTH_SECRET production
vercel env add DATABASE_URL production
vercel env add REDIS_URL production
# ... (add all variables from .env.production)

# Deploy
vercel --prod
```

## 5. Pasos de Deploy de Actualizaciones

Deploy es **automático** tras `git push origin main`:

1. **GitHub Actions** ejecuta tests
2. Si tests pasan:
   - Frontend: Se despliega automáticamente a Vercel
   - Backend: Se conecta por SSH al VPS, hace `git pull` y `docker compose up`

### Manual (si CI/CD falla):

```bash
# VPS
ssh user@your-vps
cd /opt/genmail
git pull origin main
docker compose -f infra/docker-compose.prod.yml up -d --build

# Vercel (si no hay GitHub integration)
vercel --prod
```

## 6. Troubleshooting

### Ver Logs de Servicios

```bash
# Worker (sequence processing, email sending)
docker logs -f genmail-worker --tail 100

# AI Service (email generation)
docker logs -f genmail-ai --tail 100

# Listmonk (email service)
docker logs -f genmail-listmonk --tail 100

# PostgreSQL
docker logs -f genmail-postgres --tail 100

# Redis
docker logs -f genmail-redis --tail 100

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Problemas Comunes

**Worker no envía emails:**
```bash
# Verificar si hay trabajos en cola
redis-cli LRANGE bull:email-sending:waiting 0 10

# Verificar estado de AI Service
curl http://localhost:8000/health
```

**Error de conexión a base de datos:**
```bash
# Verificar PostgreSQL
docker compose -f infra/docker-compose.prod.yml ps postgres
docker compose -f infra/docker-compose.prod.yml exec postgres pg_isready

# Resetear conexión
docker compose -f infra/docker-compose.prod.yml restart worker
```

**SSL caducado:**
```bash
# Renovar manualmente
certbot renew --force-renewal

# Restart nginx
sudo systemctl restart nginx
```

**Métricas del sistema:**
```bash
# CPU/RAM
docker stats

# Espacio en disco
df -h
```

### Comandos Útiles

```bash
# Backup manual
/opt/genmail/infra/scripts/backup.sh

# Migraciones manuales
/opt/genmail/infra/scripts/migrate.sh

# Reiniciar todo
sudo systemctl restart genmail

# Ver estado
docker compose -f infra/docker-compose.prod.yml ps

# Entrar a contenedor
docker exec -it genmail-worker sh

# Redis CLI
docker exec -it genmail-redis redis-cli
```

## 7. Monitoreo (Opcional)

### Bull Board (Dashboard de Colas - Dev Only)

Disponible en http://localhost:3001/queues cuando corres el worker local.

### Endpoints de Health

- AI Service: `GET /health`
- Web App: `GET /api/health`

## 8. Estructura de Archivos

```
/opt/genmail/
├── .env.production          # Variables de entorno
├── apps/
│   ├── ai-service/          # Python FastAPI
│   ├── web/                 # Next.js frontend
│   └── worker/              # Node.js workers (BullMQ)
├── infra/
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   │   └── genmail.conf     # Nginx config
│   └── scripts/
│       ├── setup-vps.sh     # Setup inicial
│       ├── migrate.sh       # Migraciones DB
│       └── backup.sh        # Backups diarios
├── packages/
│   ├── db/                  # Prisma schema
│   ├── queue/               # BullMQ config
│   ├── email-engine/        # Listmonk client
│   └── lead-hunter/       # Lead sourcing
└── .github/workflows/
    └── deploy.yml           # CI/CD pipeline
```

---

**Documento generado el:** $(date +%Y-%m-%d)
**Versión:** 1.0.0

