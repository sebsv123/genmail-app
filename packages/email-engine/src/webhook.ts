/**
 * Parser de webhooks de Listmonk
 * Convierte eventos de listmonk a eventos tipados de GenMail
 */

import {
  type ListmonkWebhookEvent,
  type CampaignSentEvent,
  type SubscriberOpenedEvent,
  type SubscriberClickedEvent,
  type SubscriberUnsubscribedEvent,
  type SubscriberBouncedEvent,
  type WebhookEventType,
  type GenMailAnalyticsEvent,
  ListmonkError,
} from './types';

/**
 * Validador de eventos webhook
 */
function isValidWebhookEvent(event: unknown): event is { event: string; timestamp: string; data: unknown } {
  return (
    typeof event === 'object' &&
    event !== null &&
    'event' in event &&
    'timestamp' in event &&
    'data' in event &&
    typeof (event as Record<string, unknown>).event === 'string' &&
    typeof (event as Record<string, unknown>).timestamp === 'string'
  );
}

/**
 * Parsea y valida un evento de webhook de listmonk
 * @param payload - El body del webhook recibido
 * @returns Evento tipado o null si no es reconocido
 * @throws ListmonkError si el payload es inválido
 */
export function parseWebhookEvent(payload: unknown): ListmonkWebhookEvent | null {
  if (!isValidWebhookEvent(payload)) {
    throw new ListmonkError(
      'Invalid webhook payload: missing required fields (event, timestamp, data)',
      'WEBHOOK_INVALID_PAYLOAD'
    );
  }

  const { event, timestamp, data } = payload;

  // Validar timestamp ISO
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new ListmonkError(
      `Invalid timestamp: ${timestamp}`,
      'WEBHOOK_INVALID_TIMESTAMP'
    );
  }

  switch (event as WebhookEventType) {
    case 'campaign.sent':
      return parseCampaignSentEvent(event, timestamp, data);

    case 'subscriber.opened':
      return parseSubscriberOpenedEvent(event, timestamp, data);

    case 'subscriber.clicked':
      return parseSubscriberClickedEvent(event, timestamp, data);

    case 'subscriber.unsubscribed':
      return parseSubscriberUnsubscribedEvent(event, timestamp, data);

    case 'subscriber.bounced':
      return parseSubscriberBouncedEvent(event, timestamp, data);

    default:
      // Evento no soportado - retornamos null para que el caller decida
      return null;
  }
}

/**
 * Parsea evento campaign.sent
 */
function parseCampaignSentEvent(
  event: string,
  timestamp: string,
  data: unknown
): CampaignSentEvent {
  const d = data as {
    campaign?: {
      id?: number;
      uuid?: string;
      name?: string;
      subject?: string;
    };
    subscriber_count?: number;
  };

  if (!d.campaign || typeof d.campaign.id !== 'number') {
    throw new ListmonkError(
      'Invalid campaign.sent event: missing campaign.id',
      'WEBHOOK_INVALID_DATA'
    );
  }

  return {
    event: 'campaign.sent',
    timestamp,
    data: {
      campaign: {
        id: d.campaign.id,
        uuid: d.campaign.uuid || '',
        name: d.campaign.name || '',
        subject: d.campaign.subject || '',
      },
      subscriber_count: d.subscriber_count || 0,
    },
  };
}

/**
 * Parsea evento subscriber.opened
 */
function parseSubscriberOpenedEvent(
  event: string,
  timestamp: string,
  data: unknown
): SubscriberOpenedEvent {
  const d = data as {
    campaign?: { id?: number; uuid?: string; name?: string };
    subscriber?: { id?: number; email?: string; uuid?: string };
  };

  if (!d.campaign?.id || !d.subscriber?.id) {
    throw new ListmonkError(
      'Invalid subscriber.opened event: missing campaign.id or subscriber.id',
      'WEBHOOK_INVALID_DATA'
    );
  }

  return {
    event: 'subscriber.opened',
    timestamp,
    data: {
      campaign: {
        id: d.campaign.id,
        uuid: d.campaign.uuid || '',
        name: d.campaign.name || '',
      },
      subscriber: {
        id: d.subscriber.id,
        email: d.subscriber.email || '',
        uuid: d.subscriber.uuid || '',
      },
    },
  };
}

/**
 * Parsea evento subscriber.clicked
 */
function parseSubscriberClickedEvent(
  event: string,
  timestamp: string,
  data: unknown
): SubscriberClickedEvent {
  const d = data as {
    campaign?: { id?: number; uuid?: string; name?: string };
    subscriber?: { id?: number; email?: string; uuid?: string };
    link?: string;
  };

  if (!d.campaign?.id || !d.subscriber?.id) {
    throw new ListmonkError(
      'Invalid subscriber.clicked event: missing campaign.id or subscriber.id',
      'WEBHOOK_INVALID_DATA'
    );
  }

  return {
    event: 'subscriber.clicked',
    timestamp,
    data: {
      campaign: {
        id: d.campaign.id,
        uuid: d.campaign.uuid || '',
        name: d.campaign.name || '',
      },
      subscriber: {
        id: d.subscriber.id,
        email: d.subscriber.email || '',
        uuid: d.subscriber.uuid || '',
      },
      link: d.link || '',
    },
  };
}

/**
 * Parsea evento subscriber.unsubscribed
 */
function parseSubscriberUnsubscribedEvent(
  event: string,
  timestamp: string,
  data: unknown
): SubscriberUnsubscribedEvent {
  const d = data as {
    campaign?: { id?: number; uuid?: string; name?: string };
    subscriber?: { id?: number; email?: string; uuid?: string };
    reason?: string;
  };

  if (!d.subscriber?.id) {
    throw new ListmonkError(
      'Invalid subscriber.unsubscribed event: missing subscriber.id',
      'WEBHOOK_INVALID_DATA'
    );
  }

  return {
    event: 'subscriber.unsubscribed',
    timestamp,
    data: {
      campaign: d.campaign?.id ? {
        id: d.campaign.id,
        uuid: d.campaign.uuid || '',
        name: d.campaign.name || '',
      } : undefined,
      subscriber: {
        id: d.subscriber.id,
        email: d.subscriber.email || '',
        uuid: d.subscriber.uuid || '',
      },
      reason: d.reason,
    },
  };
}

/**
 * Parsea evento subscriber.bounced
 */
function parseSubscriberBouncedEvent(
  event: string,
  timestamp: string,
  data: unknown
): SubscriberBouncedEvent {
  const d = data as {
    campaign?: { id?: number; uuid?: string; name?: string };
    subscriber?: { id?: number; email?: string; uuid?: string };
    bounce_type?: string;
    error?: string;
  };

  if (!d.campaign?.id || !d.subscriber?.id) {
    throw new ListmonkError(
      'Invalid subscriber.bounced event: missing campaign.id or subscriber.id',
      'WEBHOOK_INVALID_DATA'
    );
  }

  return {
    event: 'subscriber.bounced',
    timestamp,
    data: {
      campaign: {
        id: d.campaign.id,
        uuid: d.campaign.uuid || '',
        name: d.campaign.name || '',
      },
      subscriber: {
        id: d.subscriber.id,
        email: d.subscriber.email || '',
        uuid: d.subscriber.uuid || '',
      },
      bounce_type: d.bounce_type === 'hard' ? 'hard' : 'soft',
      error: d.error,
    },
  };
}

/**
 * Mapea un evento de listmonk a un evento de analytics de GenMail
 * @param listmonkEvent - Evento parseado de listmonk
 * @param genMailLeadId - ID del lead en GenMail (mapeado desde subscriber.email)
 * @param genMailEmailId - ID del email generado en GenMail (mapeado desde campaign.id)
 * @returns Evento listo para guardar en AnalyticsEvent
 */
export function mapToGenMailAnalyticsEvent(
  listmonkEvent: ListmonkWebhookEvent,
  genMailLeadId: string,
  genMailEmailId?: string
): GenMailAnalyticsEvent {
  const occurredAt = new Date(listmonkEvent.timestamp);

  // Mapea el tipo de evento
  let type: GenMailAnalyticsEvent['type'];
  let metadata: Record<string, unknown> = {};

  switch (listmonkEvent.event) {
    case 'campaign.sent':
      type = 'SENT';
      metadata = {
        subscriberCount: listmonkEvent.data.subscriber_count,
        campaignName: listmonkEvent.data.campaign.name,
      };
      break;

    case 'subscriber.opened':
      type = 'OPENED';
      metadata = {
        campaignId: listmonkEvent.data.campaign.id,
        subscriberId: listmonkEvent.data.subscriber.id,
      };
      break;

    case 'subscriber.clicked':
      type = 'CLICKED';
      metadata = {
        link: listmonkEvent.data.link,
        campaignId: listmonkEvent.data.campaign.id,
      };
      break;

    case 'subscriber.unsubscribed':
      type = 'UNSUBSCRIBED';
      metadata = {
        reason: listmonkEvent.data.reason,
        campaignId: listmonkEvent.data.campaign?.id,
      };
      break;

    case 'subscriber.bounced':
      type = 'BOUNCED';
      metadata = {
        bounceType: listmonkEvent.data.bounce_type,
        error: listmonkEvent.data.error,
        campaignId: listmonkEvent.data.campaign.id,
      };
      break;

    default:
      throw new ListmonkError(
        `Unknown event type: ${(listmonkEvent as { event: string }).event}`,
        'WEBHOOK_UNKNOWN_EVENT'
      );
  }

  return {
    leadId: genMailLeadId,
    generatedEmailId: genMailEmailId,
    type,
    metadata,
    occurredAt,
  };
}

/**
 * Batch parser para múltiples eventos
 * @param payloads - Array de payloads de webhook
 * @returns Array de eventos válidos (ignora los no reconocidos)
 */
export function parseWebhookBatch(payloads: unknown[]): {
  events: ListmonkWebhookEvent[];
  errors: Array<{ index: number; error: ListmonkError }>;
} {
  const events: ListmonkWebhookEvent[] = [];
  const errors: Array<{ index: number; error: ListmonkError }> = [];

  for (let i = 0; i < payloads.length; i++) {
    try {
      const event = parseWebhookEvent(payloads[i]);
      if (event) {
        events.push(event);
      }
    } catch (error) {
      errors.push({
        index: i,
        error: error instanceof ListmonkError ? error : new ListmonkError(
          String(error),
          'WEBHOOK_PARSE_ERROR'
        ),
      });
    }
  }

  return { events, errors };
}
