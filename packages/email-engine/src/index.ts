/**
 * GenMail Email Engine - Cliente interno de Listmonk
 * 
 * @packageDocumentation
 * 
 * Este paquete proporciona una abstracción tipada sobre la API de Listmonk
 * para el envío de emails y tracking de analytics.
 * 
 * @example
 * ```typescript
 * import { createListmonkClientFromEnv, parseWebhookEvent, mapToGenMailAnalyticsEvent } from '@genmail/email-engine';
 * 
 * // Crear cliente
 * const client = createListmonkClientFromEnv();
 * 
 * // Crear subscriber (lead)
 * const subscriber = await client.createSubscriber(
 *   'lead@example.com',
 *   'John Doe',
 *   { source: 'landing-page', businessId: 'biz-123' }
 * );
 * 
 * // Crear lista
 * const list = await client.createList('Newsletter GenMail', 'private');
 * 
 * // Crear campaña
 * const campaign = await client.createCampaign({
 *   name: 'Welcome Sequence',
 *   subject: 'Bienvenido a GenMail',
 *   body: '<h1>Hola</h1>...',
 *   listIds: [list.id],
 *   fromEmail: 'noreply@genmail.app',
 * });
 * 
 * // Programar envío
 * await client.scheduleCampaign(campaign.id, new Date('2024-12-01T10:00:00Z'));
 * ```
 */

// ==================== TYPES ====================
export {
  // Configuration
  type ListmonkConfig,
  
  // Errors
  ListmonkError,
  ListmonkNetworkError,
  ListmonkAuthError,
  ListmonkNotFoundError,
  ListmonkValidationError,
  
  // Subscriber
  type ListmonkSubscriber,
  type ListmonkListRef,
  type CreateSubscriberRequest,
  type UpdateSubscriberRequest,
  
  // List
  type ListmonkList,
  type CreateListRequest,
  
  // Campaign
  type CampaignStatus,
  type ListmonkCampaign,
  type CreateCampaignRequest,
  type CampaignStats,
  type ScheduleCampaignRequest,
  
  // Webhooks
  type WebhookEventType,
  type ListmonkWebhookEvent,
  type CampaignSentEvent,
  type SubscriberOpenedEvent,
  type SubscriberClickedEvent,
  type SubscriberUnsubscribedEvent,
  type SubscriberBouncedEvent,
  
  // GenMail Mapping
  type GenMailLead,
  type GenMailCampaign,
  type GenMailAnalyticsEvent,
  
  // API Responses
  type ListmonkApiResponse,
  type ListmonkPaginatedResponse,
  type ListmonkGenericResponse,
} from './types';

// ==================== CLIENT ====================
export {
  ListmonkClient,
  createListmonkClientFromEnv,
} from './client';

// ==================== WEBHOOK PARSER ====================
export {
  parseWebhookEvent,
  mapToGenMailAnalyticsEvent,
  parseWebhookBatch,
} from './webhook';

// ==================== VERSION ====================
export const VERSION = '0.1.0';
