/**
 * Cliente HTTP para Listmonk API
 * Incluye reintentos con backoff exponencial
 */

import {
  type ListmonkConfig,
  type ListmonkSubscriber,
  type CreateSubscriberRequest,
  type UpdateSubscriberRequest,
  type ListmonkList,
  type CreateListRequest,
  type ListmonkCampaign,
  type CreateCampaignRequest,
  type CampaignStats,
  type ListmonkPaginatedResponse,
  type ListmonkApiResponse,
  type ListmonkGenericResponse,
  ListmonkError,
  ListmonkNetworkError,
  ListmonkAuthError,
  ListmonkNotFoundError,
  ListmonkValidationError,
} from './types';

interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Calcula el delay para reintentos con backoff exponencial y jitter
 */
function calculateBackoff(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);
  // Añade jitter aleatorio (±25%) para evitar thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, cappedDelay + jitter);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parsea el error de respuesta HTTP
 */
async function parseError(response: Response): Promise<ListmonkError> {
  const status = response.status;
  
  // Intenta parsear JSON
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  const message = typeof body === 'object' && body !== null && 'message' in body
    ? String((body as Record<string, unknown>).message)
    : `HTTP ${status}: ${response.statusText}`;

  if (status === 401) {
    return new ListmonkAuthError();
  }

  if (status === 404) {
    return new ListmonkNotFoundError('Resource', 'unknown');
  }

  if (status === 400 && typeof body === 'object' && body !== null && 'errors' in body) {
    const errors = (body as { errors: Array<{ field: string; message: string }> }).errors;
    return new ListmonkValidationError(message, errors || []);
  }

  return new ListmonkError(message, `HTTP_${status}`, status, body);
}

export class ListmonkClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly timeout: number;
  private readonly retryOptions: RetryOptions;

  constructor(config: ListmonkConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    this.timeout = config.timeout || 30000;
    this.retryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      maxRetries: config.retries ?? DEFAULT_RETRY_OPTIONS.maxRetries,
    };
  }

  /**
   * Realiza una petición HTTP con reintentos automáticos
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retryAttempt: number = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Verifica si es reintentable
      if (!response.ok) {
        const error = await parseError(response);
        
        // Reintentar si es un error 5xx o rate limit
        if (
          this.retryOptions.retryableStatuses.includes(response.status) &&
          retryAttempt < this.retryOptions.maxRetries
        ) {
          const delay = calculateBackoff(retryAttempt, this.retryOptions);
          await sleep(delay);
          return this.request(method, path, body, retryAttempt + 1);
        }

        throw error;
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json() as T;

    } catch (error) {
      clearTimeout(timeoutId);

      // Reintentar errores de red
      if (
        error instanceof TypeError ||
        error instanceof Error && error.name === 'AbortError'
      ) {
        if (retryAttempt < this.retryOptions.maxRetries) {
          const delay = calculateBackoff(retryAttempt, this.retryOptions);
          await sleep(delay);
          return this.request(method, path, body, retryAttempt + 1);
        }
        throw new ListmonkNetworkError(
          error instanceof Error ? error.message : 'Network error',
          error instanceof Error ? error : undefined
        );
      }

      throw error;
    }
  }

  // ==================== SUBSCRIBERS ====================

  /**
   * Crea un nuevo subscriber en listmonk
   * Mappea a: Lead en GenMail
   */
  async createSubscriber(
    email: string,
    name: string,
    attributes: Record<string, unknown> = {},
    listIds: number[] = []
  ): Promise<ListmonkSubscriber> {
    const request: CreateSubscriberRequest = {
      email,
      name,
      attribs: attributes,
      lists: listIds,
      status: 'enabled',
    };

    const response = await this.request<ListmonkApiResponse<ListmonkSubscriber>>('POST', '/api/subscribers', request);
    return response.data;
  }

  /**
   * Actualiza un subscriber existente
   */
  async updateSubscriber(
    id: number,
    data: Partial<Omit<UpdateSubscriberRequest, 'id'>>
  ): Promise<ListmonkSubscriber> {
    const request: UpdateSubscriberRequest = {
      email: data.email,
      name: data.name,
      status: data.status,
      lists: data.lists,
      attribs: data.attribs,
    };

    const response = await this.request<ListmonkApiResponse<ListmonkSubscriber>>('PUT', `/api/subscribers/${id}`, request);
    return response.data;
  }

  /**
   * Busca un subscriber por email
   */
  async getSubscriber(email: string): Promise<ListmonkSubscriber | null> {
    try {
      const response = await this.request<ListmonkPaginatedResponse<ListmonkSubscriber>>(
        'GET',
        `/api/subscribers?query=email='${encodeURIComponent(email)}'`
      );
      
      if (response.data.length === 0) {
        return null;
      }
      
      return response.data[0];
    } catch (error) {
      if (error instanceof ListmonkNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Obtiene o crea un subscriber por email
   */
  async getOrCreateSubscriber(
    email: string,
    name: string,
    attributes: Record<string, unknown> = {}
  ): Promise<ListmonkSubscriber> {
    const existing = await this.getSubscriber(email);
    if (existing) {
      return existing;
    }
    return this.createSubscriber(email, name, attributes);
  }

  // ==================== LISTS ====================

  /**
   * Crea una nueva lista
   * Las listas en listmonk equivalen a segmentos de leads en GenMail
   */
  async createList(name: string, type: 'public' | 'private' = 'private'): Promise<ListmonkList> {
    const request: CreateListRequest = {
      name,
      type,
      optin: 'single',
    };

    const response = await this.request<ListmonkApiResponse<ListmonkList>>('POST', '/api/lists', request);
    return response.data;
  }

  /**
   * Busca una lista por nombre
   */
  async findListByName(name: string): Promise<ListmonkList | null> {
    try {
      const response = await this.request<ListmonkPaginatedResponse<ListmonkList>>(
        'GET',
        `/api/lists?query=name='${encodeURIComponent(name)}'`
      );
      
      if (response.data.length === 0) {
        return null;
      }
      
      return response.data[0];
    } catch (error) {
      if (error instanceof ListmonkNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Obtiene o crea una lista por nombre
   */
  async getOrCreateList(name: string, type: 'public' | 'private' = 'private'): Promise<ListmonkList> {
    const existing = await this.findListByName(name);
    if (existing) {
      return existing;
    }
    return this.createList(name, type);
  }

  // ==================== CAMPAIGNS ====================

  /**
   * Crea una campaña en estado draft
   * Las campañas listmonk se crean desde GeneratedEmail de GenMail
   */
  async createCampaign(params: {
    name: string;
    subject: string;
    body: string;
    altbody?: string;
    listIds: number[];
    fromEmail: string;
    scheduledAt?: Date;
    tags?: string[];
  }): Promise<ListmonkCampaign> {
    const request: CreateCampaignRequest = {
      name: params.name,
      subject: params.subject,
      body: params.body,
      altbody: params.altbody,
      lists: params.listIds,
      from_email: params.fromEmail,
      send_later: !!params.scheduledAt,
      send_at: params.scheduledAt?.toISOString(),
      tags: params.tags || [],
      messenger: 'email',
    };

    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>('POST', '/api/campaigns', request);
    return response.data;
  }

  /**
   * Programa una campaña para envío futuro
   */
  async scheduleCampaign(id: number, scheduledAt: Date): Promise<ListmonkCampaign> {
    const request = {
      send_later: true,
      send_at: scheduledAt.toISOString(),
    };

    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>('PUT', `/api/campaigns/${id}/status`, request);
    return response.data;
  }

  /**
   * Inicia el envío de una campaña inmediatamente
   */
  async startCampaign(id: number): Promise<ListmonkCampaign> {
    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>('PUT', `/api/campaigns/${id}/status`, {
      status: 'running',
    });
    return response.data;
  }

  /**
   * Obtiene estadísticas de una campaña
   */
  async getCampaignStats(id: number): Promise<CampaignStats> {
    const response = await this.request<CampaignStats>('GET', `/api/campaigns/${id}/stats`);
    return response;
  }

  /**
   * Obtiene una campaña por ID
   */
  async getCampaign(id: number): Promise<ListmonkCampaign> {
    const response = await this.request<ListmonkApiResponse<ListmonkCampaign>>('GET', `/api/campaigns/${id}`);
    return response.data;
  }

  // ==================== SUBSCRIPTIONS ====================

  /**
   * Agrega un subscriber a una lista
   */
  async addSubscriberToList(subscriberId: number, listId: number): Promise<void> {
    await this.request<ListmonkGenericResponse>('POST', `/api/subscribers/${subscriberId}/lists`, {
      list_ids: [listId],
      action: 'add',
    });
  }

  /**
   * Remueve un subscriber de una lista
   */
  async removeSubscriberFromList(subscriberId: number, listId: number): Promise<void> {
    await this.request<ListmonkGenericResponse>('POST', `/api/subscribers/${subscriberId}/lists`, {
      list_ids: [listId],
      action: 'remove',
    });
  }

  /**
   * Desuscribe un subscriber de todas las listas (unsubscribe global)
   */
  async unsubscribe(subscriberEmail: string): Promise<void> {
    const subscriber = await this.getSubscriber(subscriberEmail);
    if (!subscriber) {
      throw new ListmonkNotFoundError('Subscriber', subscriberEmail);
    }

    await this.request<ListmonkGenericResponse>('PUT', `/api/subscribers/${subscriber.id}/blocklist`, {
      blocklisted: true,
    });
  }

  /**
   * Re-subscribe un subscriber (remueve de blocklist)
   */
  async resubscribe(subscriberEmail: string): Promise<void> {
    const subscriber = await this.getSubscriber(subscriberEmail);
    if (!subscriber) {
      throw new ListmonkNotFoundError('Subscriber', subscriberEmail);
    }

    await this.request<ListmonkGenericResponse>('PUT', `/api/subscribers/${subscriber.id}/blocklist`, {
      blocklisted: false,
    });
  }
}

/**
 * Factory para crear cliente desde variables de entorno
 */
export function createListmonkClientFromEnv(): ListmonkClient {
  const baseUrl = process.env.LISTMONK_BASE_URL;
  const username = process.env.LISTMONK_USERNAME;
  const password = process.env.LISTMONK_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new ListmonkError(
      'Missing required environment variables: LISTMONK_BASE_URL, LISTMONK_USERNAME, LISTMONK_PASSWORD',
      'CONFIG_ERROR'
    );
  }

  return new ListmonkClient({
    baseUrl,
    username,
    password,
    timeout: parseInt(process.env.LISTMONK_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.LISTMONK_RETRIES || '3', 10),
  });
}
