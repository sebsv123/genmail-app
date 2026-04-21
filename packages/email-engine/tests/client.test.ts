/**
 * Tests para ListmonkClient
 * Usa fetch mockeado para evitar llamadas reales a la API
 */

import { ListmonkClient, createListmonkClientFromEnv } from '../src/client';
import {
  ListmonkError,
  ListmonkAuthError,
  ListmonkNotFoundError,
  ListmonkNetworkError,
} from '../src/types';

// Mock fetch global
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ListmonkClient', () => {
  const config = {
    baseUrl: 'http://localhost:9000',
    username: 'admin',
    password: 'admin',
    timeout: 5000,
    retries: 2,
  };

  let client: ListmonkClient;

  beforeEach(() => {
    client = new ListmonkClient(config);
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubscriber', () => {
    it('should create a subscriber successfully', async () => {
      const mockResponse = {
        data: {
          id: 1,
          uuid: 'test-uuid',
          email: 'test@example.com',
          name: 'Test User',
          status: 'enabled',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          attribs: { source: 'test' },
          lists: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await client.createSubscriber(
        'test@example.com',
        'Test User',
        { source: 'test' }
      );

      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.attribs).toEqual({ source: 'test' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/subscribers'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test@example.com'),
        })
      );
    });

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Validation failed',
          errors: [{ field: 'email', message: 'Email already exists' }],
        }),
      } as Response);

      await expect(
        client.createSubscriber('test@example.com', 'Test User')
      ).rejects.toThrow(ListmonkError);
    });

    it('should retry on 5xx errors', async () => {
      // First call fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      } as Response);

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            id: 1,
            uuid: 'uuid',
            email: 'test@example.com',
            name: 'Test User',
            status: 'enabled',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            attribs: {},
            lists: [],
          },
        }),
      } as Response);

      const result = await client.createSubscriber('test@example.com', 'Test User');
      expect(result.email).toBe('test@example.com');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getSubscriber', () => {
    it('should return subscriber when found', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            uuid: 'test-uuid',
            email: 'test@example.com',
            name: 'Test User',
            status: 'enabled',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            attribs: {},
            lists: [],
          },
        ],
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await client.getSubscriber('test@example.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when subscriber not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [], total: 0 }),
      } as Response);

      const result = await client.getSubscriber('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createList', () => {
    it('should create a list successfully', async () => {
      const mockResponse = {
        data: {
          id: 1,
          uuid: 'list-uuid',
          name: 'Test List',
          type: 'private',
          optin: 'single',
          tags: [],
          subscriber_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await client.createList('Test List', 'private');

      expect(result.name).toBe('Test List');
      expect(result.type).toBe('private');
    });
  });

  describe('createCampaign', () => {
    it('should create a campaign successfully', async () => {
      const mockResponse = {
        data: {
          id: 1,
          uuid: 'campaign-uuid',
          name: 'Welcome Campaign',
          subject: 'Welcome!',
          status: 'draft',
          type: 'regular',
          from_email: 'noreply@example.com',
          body: '<h1>Welcome</h1>',
          altbody: 'Welcome!',
          send_at: null,
          sent_at: null,
          started_at: null,
          to_send: 0,
          sent: 0,
          lists: [],
          views: 0,
          clicks: 0,
          bounces: 0,
          tags: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const result = await client.createCampaign({
        name: 'Welcome Campaign',
        subject: 'Welcome!',
        body: '<h1>Welcome</h1>',
        listIds: [1],
        fromEmail: 'noreply@example.com',
      });

      expect(result.name).toBe('Welcome Campaign');
      expect(result.status).toBe('draft');
    });

    it('should create a scheduled campaign', async () => {
      const mockResponse = {
        data: {
          id: 1,
          uuid: 'campaign-uuid',
          name: 'Scheduled Campaign',
          subject: 'Hello!',
          status: 'scheduled',
          type: 'regular',
          from_email: 'noreply@example.com',
          body: '<h1>Hello</h1>',
          altbody: '',
          send_at: '2024-12-01T10:00:00Z',
          sent_at: null,
          started_at: null,
          to_send: 100,
          sent: 0,
          lists: [{ id: 1, uuid: 'list-uuid', name: 'Test List', subscription_status: 'confirmed' }],
          views: 0,
          clicks: 0,
          bounces: 0,
          tags: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const scheduledAt = new Date('2024-12-01T10:00:00Z');
      const result = await client.createCampaign({
        name: 'Scheduled Campaign',
        subject: 'Hello!',
        body: '<h1>Hello</h1>',
        listIds: [1],
        fromEmail: 'noreply@example.com',
        scheduledAt,
      });

      expect(result.send_at).toBe('2024-12-01T10:00:00Z');
    });
  });

  describe('scheduleCampaign', () => {
    it('should schedule a campaign', async () => {
      const mockResponse = {
        data: {
          id: 1,
          uuid: 'campaign-uuid',
          name: 'Scheduled Campaign',
          subject: 'Hello!',
          status: 'scheduled',
          type: 'regular',
          from_email: 'noreply@example.com',
          body: '<h1>Hello</h1>',
          send_at: '2024-12-01T10:00:00Z',
          sent_at: null,
          started_at: null,
          to_send: 100,
          sent: 0,
          lists: [],
          views: 0,
          clicks: 0,
          bounces: 0,
          tags: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const scheduledAt = new Date('2024-12-01T10:00:00Z');
      const result = await client.scheduleCampaign(1, scheduledAt);

      expect(result.status).toBe('scheduled');
    });
  });

  describe('getCampaignStats', () => {
    it('should return campaign statistics', async () => {
      const mockStats = {
        id: 1,
        uuid: 'campaign-uuid',
        status: 'finished',
        to_send: 100,
        sent: 100,
        delivered: 98,
        opened: 45,
        clicked: 12,
        bounced: 2,
        complained: 0,
        unsubscribed: 1,
        view_rate: 45.9,
        click_rate: 12.2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats,
      } as Response);

      const result = await client.getCampaignStats(1);

      expect(result.to_send).toBe(100);
      expect(result.sent).toBe(100);
      expect(result.view_rate).toBe(45.9);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe a subscriber', async () => {
      // First call to get subscriber
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 1,
              uuid: 'subscriber-uuid',
              email: 'test@example.com',
              name: 'Test User',
              status: 'enabled',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              attribs: {},
              lists: [],
            },
          ],
          total: 1,
        }),
      } as Response);

      // Second call to blocklist
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: true }),
      } as Response);

      await client.unsubscribe('test@example.com');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/subscribers/1/blocklist'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('blocklisted'),
        })
      );
    });

    it('should throw NotFoundError if subscriber does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [], total: 0 }),
      } as Response);

      await expect(client.unsubscribe('notfound@example.com')).rejects.toThrow(ListmonkNotFoundError);
    });
  });

  describe('error handling', () => {
    it('should throw auth error on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      } as Response);

      await expect(client.getSubscriber('test@example.com')).rejects.toThrow(ListmonkAuthError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      // Allow retries
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));
      mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

      await expect(client.getSubscriber('test@example.com')).rejects.toThrow(ListmonkNetworkError);
    });
  });
});

describe('createListmonkClientFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should create client from environment variables', () => {
    process.env.LISTMONK_BASE_URL = 'http://listmonk:9000';
    process.env.LISTMONK_USERNAME = 'admin';
    process.env.LISTMONK_PASSWORD = 'secret';

    const client = createListmonkClientFromEnv();
    expect(client).toBeInstanceOf(ListmonkClient);
  });

  it('should throw error if env vars are missing', () => {
    delete process.env.LISTMONK_BASE_URL;
    delete process.env.LISTMONK_USERNAME;
    delete process.env.LISTMONK_PASSWORD;

    expect(() => createListmonkClientFromEnv()).toThrow(ListmonkError);
  });

  it('should respect optional timeout and retries', () => {
    process.env.LISTMONK_BASE_URL = 'http://listmonk:9000';
    process.env.LISTMONK_USERNAME = 'admin';
    process.env.LISTMONK_PASSWORD = 'secret';
    process.env.LISTMONK_TIMEOUT = '10000';
    process.env.LISTMONK_RETRIES = '5';

    const client = createListmonkClientFromEnv();
    expect(client).toBeInstanceOf(ListmonkClient);
  });
});
