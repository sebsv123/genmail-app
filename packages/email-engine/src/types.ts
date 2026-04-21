/**
 * Tipos para Listmonk API
 * https://listmonk.app/docs/apis/
 */

// ==================== CONFIGURATION ====================

export interface ListmonkConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout?: number;
  retries?: number;
}

// ==================== ERRORS ====================

export class ListmonkError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'ListmonkError';
  }
}

export class ListmonkNetworkError extends ListmonkError {
  constructor(message: string, public readonly cause?: Error) {
    super(message, 'NETWORK_ERROR');
    this.name = 'ListmonkNetworkError';
  }
}

export class ListmonkAuthError extends ListmonkError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'ListmonkAuthError';
  }
}

export class ListmonkNotFoundError extends ListmonkError {
  constructor(resource: string, id: string | number) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
    this.name = 'ListmonkNotFoundError';
  }
}

export class ListmonkValidationError extends ListmonkError {
  constructor(
    message: string,
    public readonly errors: Array<{ field: string; message: string }>
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ListmonkValidationError';
  }
}

// ==================== SUBSCRIBER ====================

export interface ListmonkSubscriber {
  id: number;
  uuid: string;
  email: string;
  name: string;
  status: 'enabled' | 'disabled' | 'blocklisted';
  created_at: string;
  updated_at: string;
  attribs: Record<string, unknown>;
  lists: ListmonkListRef[];
}

export interface ListmonkListRef {
  id: number;
  uuid: string;
  name: string;
  type: 'public' | 'private' | 'tmp';
  subscription_status: 'unconfirmed' | 'confirmed';
}

export interface CreateSubscriberRequest {
  email: string;
  name: string;
  status?: 'enabled' | 'disabled';
  lists?: number[];
  preconfirm_subscriptions?: boolean;
  attribs?: Record<string, unknown>;
}

export interface UpdateSubscriberRequest {
  email?: string;
  name?: string;
  status?: 'enabled' | 'disabled';
  lists?: number[];
  attribs?: Record<string, unknown>;
}

// ==================== LIST ====================

export interface ListmonkList {
  id: number;
  uuid: string;
  name: string;
  type: 'public' | 'private' | 'tmp';
  optin: 'single' | 'double';
  tags: string[];
  subscriber_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateListRequest {
  name: string;
  type: 'public' | 'private';
  optin?: 'single' | 'double';
  tags?: string[];
}

// ==================== CAMPAIGN ====================

export type CampaignStatus = 
  | 'draft' 
  | 'scheduled' 
  | 'running' 
  | 'paused' 
  | 'finished' 
  | 'cancelled';

export interface ListmonkCampaign {
  id: number;
  uuid: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  type: 'regular' | 'optin';
  from_email: string;
  body: string;
  altbody: string;
  send_at: string | null;
  sent_at: string | null;
  started_at: string | null;
  to_send: number;
  sent: number;
  lists: ListmonkListRef[];
  views: number;
  clicks: number;
  bounces: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignRequest {
  name: string;
  subject: string;
  from_email: string;
  body: string;
  altbody?: string;
  type?: 'regular';
  lists: number[];
  tags?: string[];
  send_later?: boolean;
  send_at?: string; // ISO 8601
  messenger?: 'email';
  template_id?: number;
}

export interface CampaignStats {
  id: number;
  uuid: string;
  status: CampaignStatus;
  to_send: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  view_rate: number;
  click_rate: number;
}

export interface ScheduleCampaignRequest {
  campaign_id: number;
  send_at: string; // ISO 8601
}

// ==================== WEBHOOK EVENTS ====================

export type WebhookEventType = 
  | 'campaign.sent'
  | 'subscriber.opened'
  | 'subscriber.clicked'
  | 'subscriber.unsubscribed'
  | 'subscriber.bounced';

export interface BaseWebhookEvent {
  event: WebhookEventType;
  timestamp: string;
  data: unknown;
}

export interface CampaignSentEvent extends BaseWebhookEvent {
  event: 'campaign.sent';
  data: {
    campaign: {
      id: number;
      uuid: string;
      name: string;
      subject: string;
    };
    subscriber_count: number;
  };
}

export interface SubscriberOpenedEvent extends BaseWebhookEvent {
  event: 'subscriber.opened';
  data: {
    campaign: {
      id: number;
      uuid: string;
      name: string;
    };
    subscriber: {
      id: number;
      email: string;
      uuid: string;
    };
  };
}

export interface SubscriberClickedEvent extends BaseWebhookEvent {
  event: 'subscriber.clicked';
  data: {
    campaign: {
      id: number;
      uuid: string;
      name: string;
    };
    subscriber: {
      id: number;
      email: string;
      uuid: string;
    };
    link: string;
  };
}

export interface SubscriberUnsubscribedEvent extends BaseWebhookEvent {
  event: 'subscriber.unsubscribed';
  data: {
    campaign?: {
      id: number;
      uuid: string;
      name: string;
    };
    subscriber: {
      id: number;
      email: string;
      uuid: string;
    };
    reason?: string;
  };
}

export interface SubscriberBouncedEvent extends BaseWebhookEvent {
  event: 'subscriber.bounced';
  data: {
    campaign: {
      id: number;
      uuid: string;
      name: string;
    };
    subscriber: {
      id: number;
      email: string;
      uuid: string;
    };
    bounce_type: 'soft' | 'hard';
    error?: string;
  };
}

export type ListmonkWebhookEvent =
  | CampaignSentEvent
  | SubscriberOpenedEvent
  | SubscriberClickedEvent
  | SubscriberUnsubscribedEvent
  | SubscriberBouncedEvent;

// ==================== GENMAIL MAPPING ====================

/**
 * Mapeo de entidades GenMail a Listmonk
 */
export interface GenMailLead {
  id: string;
  email: string;
  name: string;
  businessId: string;
  stage: string;
  contextData?: Record<string, unknown>;
}

export interface GenMailCampaign {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  businessId: string;
  listIds: string[]; // listmonk list IDs
  fromEmail: string;
  scheduledAt?: Date;
}

export interface GenMailAnalyticsEvent {
  id?: string;
  leadId: string;
  generatedEmailId?: string;
  type: 'SENT' | 'OPENED' | 'CLICKED' | 'UNSUBSCRIBED' | 'BOUNCED';
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

// ==================== API RESPONSES ====================

export interface ListmonkApiResponse<T> {
  data: T;
}

export interface ListmonkPaginatedResponse<T> {
  data: T[];
  total: number;
  per_page: number;
  page: number;
}

export interface ListmonkGenericResponse {
  data: boolean;
}
