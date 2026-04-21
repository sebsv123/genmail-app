# @genmail/email-engine

Cliente TypeScript para integración con **listmonk** - motor de envío de emails self-hosted.

> **⚠️ Nota importante:** Este paquete es para uso interno de GenMail. Los usuarios finales nunca interactúan directamente con listmonk; solo ven la UI de GenMail.

## Mapeo de Entidades

| GenMail | listmonk | Descripción |
|---------|----------|-------------|
| `Lead` | `Subscriber` | Un lead en GenMail es un subscriber en listmonk |
| `Campaign` | `Campaign` | Las campañas de GenMail crean campañas en listmonk |
| `List` | `List` | Listas de leads en GenMail = Listas en listmonk |
| `GeneratedEmail` | `Campaign` (draft) | Cada email generado puede convertirse en una campaña |
| `AnalyticsEvent` | Eventos webhook | Aperturas, clicks, bounces se reciben vía webhook |

## Configuración

Variables de entorno requeridas:

```bash
LISTMONK_BASE_URL=http://localhost:9000
LISTMONK_USERNAME=admin
LISTMONK_PASSWORD=admin
LISTMONK_TIMEOUT=30000          # opcional, default: 30000ms
LISTMONK_RETRIES=3              # opcional, default: 3
```

## Uso

### Cliente

```typescript
import { 
  createListmonkClientFromEnv, 
  ListmonkClient,
  ListmonkError 
} from '@genmail/email-engine';

// Desde variables de entorno
const client = createListmonkClientFromEnv();

// O manualmente
const client = new ListmonkClient({
  baseUrl: 'http://localhost:9000',
  username: 'admin',
  password: 'admin',
});
```

### Subscribers (Leads)

```typescript
// Crear lead
const subscriber = await client.createSubscriber(
  'lead@example.com',
  'John Doe',
  { 
    source: 'landing-page',
    businessId: 'biz-123',
    stage: 'NEW'
  }
);

// Buscar por email
const existing = await client.getSubscriber('lead@example.com');

// Actualizar
await client.updateSubscriber(subscriber.id, {
  name: 'Jane Doe',
  attribs: { stage: 'QUALIFIED' }
});
```

### Lists

```typescript
// Crear lista (segmento)
const list = await client.createList('Newsletter GenMail', 'private');

// Agregar subscriber a lista
await client.addSubscriberToList(subscriber.id, list.id);
```

### Campaigns

```typescript
// Crear campaña (draft)
const campaign = await client.createCampaign({
  name: 'Welcome Email #1',
  subject: '¡Bienvenido a GenMail!',
  body: '<h1>Hola</h1><p>...</p>',
  altbody: 'Hola! ...',
  listIds: [list.id],
  fromEmail: 'hola@genmail.app',
});

// Programar envío
await client.scheduleCampaign(campaign.id, new Date('2024-12-01T10:00:00Z'));

// Inmediatamente
await client.startCampaign(campaign.id);

// Estadísticas
const stats = await client.getCampaignStats(campaign.id);
console.log(`Enviados: ${stats.sent}, Abiertos: ${stats.opened}, Tasa: ${stats.view_rate}%`);
```

### Unsubscribe

```typescript
// Desuscribir un lead (blocklist)
await client.unsubscribe('lead@example.com');

// Re-subscribir
await client.resubscribe('lead@example.com');
```

## Webhooks

listmonk envía eventos vía webhook que debemos parsear:

```typescript
import { parseWebhookEvent, mapToGenMailAnalyticsEvent } from '@genmail/email-engine';

// En tu handler de webhook
app.post('/webhooks/listmonk', (req, res) => {
  try {
    const event = parseWebhookEvent(req.body);
    
    if (!event) {
      // Evento no soportado
      return res.status(200).send('Ignored');
    }
    
    // Mapear a evento de GenMail
    const analyticsEvent = mapToGenMailAnalyticsEvent(
      event,
      'lead-uuid-de-genmail',      // buscado por email
      'generated-email-uuid'         // opcional
    );
    
    // Guardar en AnalyticsEvent de Prisma
    await prisma.analyticsEvent.create({
      data: {
        leadId: analyticsEvent.leadId,
        generatedEmailId: analyticsEvent.generatedEmailId,
        type: analyticsEvent.type,  // SENT, OPENED, CLICKED, etc.
        metadata: analyticsEvent.metadata,
        occurredAt: analyticsEvent.occurredAt,
      }
    });
    
    res.status(200).send('OK');
  } catch (error) {
    if (error instanceof ListmonkError) {
      console.error('Webhook error:', error.code, error.message);
    }
    res.status(400).send('Invalid');
  }
});
```

### Eventos soportados

| Evento listmonk | Tipo GenMail | Metadata incluida |
|-----------------|--------------|-------------------|
| `campaign.sent` | `SENT` | subscriberCount, campaignName |
| `subscriber.opened` | `OPENED` | campaignId, subscriberId |
| `subscriber.clicked` | `CLICKED` | link, campaignId |
| `subscriber.unsubscribed` | `UNSUBSCRIBED` | reason, campaignId |
| `subscriber.bounced` | `BOUNCED` | bounceType, error, campaignId |

### Batch processing

```typescript
import { parseWebhookBatch } from '@genmail/email-engine';

// Procesar múltiples eventos
const { events, errors } = parseWebhookBatch(req.body.events);

for (const event of events) {
  // Procesar evento válido
}

for (const { index, error } of errors) {
  console.error(`Event ${index} failed:`, error.message);
}
```

## Manejo de Errores

```typescript
import {
  ListmonkError,
  ListmonkAuthError,
  ListmonkNotFoundError,
  ListmonkValidationError,
  ListmonkNetworkError,
} from '@genmail/email-engine';

try {
  await client.createSubscriber('test@example.com', 'Test');
} catch (error) {
  if (error instanceof ListmonkAuthError) {
    // Revisar credenciales
  } else if (error instanceof ListmonkNotFoundError) {
    // Recurso no existe
  } else if (error instanceof ListmonkValidationError) {
    // Datos inválidos
    console.log(error.errors); // Array de { field, message }
  } else if (error instanceof ListmonkNetworkError) {
    // Error de red (ya se reintentó automáticamente)
  } else if (error instanceof ListmonkError) {
    // Error genérico de listmonk
    console.log(error.statusCode, error.code);
  }
}
```

## Reintentos Automáticos

El cliente incluye reintentos con **backoff exponencial + jitter** para:

- Errores HTTP 5xx (500, 502, 503, 504)
- Timeouts (408)
- Rate limiting (429) - *recomienda implementar backoff exponencial*
- Errores de red (ECONNRESET, ETIMEDOUT, etc.)

Configuración:

```typescript
const client = new ListmonkClient({
  baseUrl: 'http://localhost:9000',
  username: 'admin',
  password: 'admin',
  retries: 3,        // máximo de reintentos
  timeout: 30000,    // ms
});
```

**Fórmula de backoff:**
```
delay = min(initialDelay * 2^attempt, maxDelay) + jitter
```

Default:
- initialDelay: 1000ms
- maxDelay: 10000ms  
- jitter: ±25%

## API de listmonk

Este cliente consume:
- `GET/POST/PUT /api/subscribers`
- `GET/POST /api/lists`
- `GET/POST/PUT /api/campaigns`
- `GET /api/campaigns/:id/stats`
- `POST /api/subscribers/:id/lists`
- `PUT /api/subscribers/:id/blocklist`

Documentación completa: https://listmonk.app/docs/apis/

## Desarrollo

```bash
# Tests
pnpm test
pnpm test:watch

# Build
pnpm build

# Type check
pnpm typecheck
```
