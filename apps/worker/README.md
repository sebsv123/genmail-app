# Worker Service

## Estructura Actual

```
apps/worker/
├── Dockerfile              → Build multi-stage con Node 20 Alpine + pnpm + Turbo
├── entrypoint.sh           → Script de entrada (no usado actualmente)
├── package.json            → @genmail/worker, dependencias: bullmq, ioredis, pg, axios, cheerio
├── tsconfig.json           → TypeScript config
└── src/
    ├── index.ts            → Entry point: inicia 7 workers + 4 schedulers + graceful shutdown
    ├── lib/
    │   ├── ai-client.ts    → Cliente HTTP para ai-service (POST /generate-email, /evaluate-email, etc.)
    │   ├── best-practices.ts → Reglas de mejores prácticas para email marketing
    │   ├── db.ts           → Conexión PostgreSQL con pg
    │   └── listmonk-client.ts → Cliente HTTP para Listmonk API
    └── workers/
        ├── sequence.worker.ts  → Worker BullMQ: ejecuta secuencias de emails
        ├── email.worker.ts     → Worker BullMQ: envía emails vía Listmonk
        ├── hunt.worker.ts      → Worker BullMQ: hunting de leads (Apollo, Hunter, Google Places)
        ├── ingestion.worker.ts → Worker BullMQ: ingesta y procesamiento de leads
        ├── learning.worker.ts  → Worker BullMQ: aprendizaje y optimización
        ├── ab-test.worker.ts   → Worker BullMQ: A/B testing de emails
        ├── alerts.worker.ts    → Worker BullMQ: alertas y notificaciones
        └── signals.worker.ts   → Worker BullMQ: señales de mercado (Apollo Signals)
```

### Workers (todos via BullMQ)
| Worker | Concurrencia | Descripción |
|--------|-------------|-------------|
| sequence | 1 | Ejecuta secuencias multi-email |
| email | 5 | Envío de emails vía Listmonk |
| hunt | 2 | Hunting de leads (Apollo, Hunter, Google Places) |
| ingestion | 2 | Ingesta y procesamiento de leads |
| learning | 1 | Aprendizaje y optimización |
| ab-test | 1 | A/B testing |
| signals | 3 | Señales de mercado |

### Schedulers
| Scheduler | Intervalo | Descripción |
|-----------|-----------|-------------|
| sequence | Cada 5 min | Programa siguientes pasos de secuencias |
| ingestion | Cada 6h | Refresca RSS de leads |
| learning | - | Tareas de aprendizaje periódicas |
| signals | Cada 6h | Recolecta tendencias de mercado |

### Dependencias clave
- `@genmail/queue` → Colas BullMQ (shared package)
- `@genmail/db` → Prisma ORM + PostgreSQL
- `@genmail/email-engine` → Motor de generación de emails
- `@genmail/lead-hunter` → Hunting de leads
- `bullmq` → Colas con Redis
- `ioredis` → Cliente Redis
- `pg` → Cliente PostgreSQL directo
- `axios` → HTTP client
