# GenMail

SaaS de email marketing con IA.

## Requisitos

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Python 3.11+ (para AI Service)

## Inicio Rápido

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar infraestructura
pnpm infra:up
# o directamente:
docker compose -f infra/docker-compose.yml up -d

# 3. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Iniciar desarrollo
pnpm dev
```

## Scripts Disponibles

- `pnpm dev` - Inicia todos los servicios en modo desarrollo
- `pnpm build` - Compila todos los proyectos
- `pnpm lint` - Ejecuta linters
- `pnpm test` - Ejecuta tests
- `pnpm infra:up` - Levanta servicios de infraestructura
- `pnpm infra:down` - Detiene servicios de infraestructura

## Arquitectura

- **apps/web**: Frontend Next.js 15 con App Router
- **apps/ai-service**: API Python FastAPI para servicios de IA
- **packages/db**: Cliente de base de datos
- **packages/queue**: Gestión de colas con Redis
- **packages/email-engine**: Motor de envío de emails
- **packages/shared**: Tipos y utilidades compartidas

## Infraestructura

- PostgreSQL 16 + pgvector
- Redis 7
- Listmonk (gestión de listas de email)

## Licencia

Proprietary - GenMail Team
