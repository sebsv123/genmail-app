# Arquitectura GenMail

## Visión General

GenMail es un SaaS de email marketing impulsado por IA, construido con arquitectura modular y escalable.

## Stack Tecnológico

### Frontend
- Next.js 15 con App Router
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui

### Backend
- AI Service: Python FastAPI
- Base de datos: PostgreSQL 16 + pgvector
- Colas: Redis 7
- Email: Listmonk

### Infraestructura
- Docker & Docker Compose
- pnpm workspaces + Turborepo

## Componentes

*Documento en construcción*
