/**
 * Tests para webhook parser
 */

import {
  parseWebhookEvent,
  mapToGenMailAnalyticsEvent,
  parseWebhookBatch,
} from '../src/webhook';
import {
  ListmonkError,
  type CampaignSentEvent,
  type SubscriberOpenedEvent,
  type SubscriberClickedEvent,
  type SubscriberUnsubscribedEvent,
  type SubscriberBouncedEvent,
} from '../src/types';

describe('parseWebhookEvent', () => {
  describe('campaign.sent', () => {
    it('should parse campaign sent event', () => {
      const payload = {
        event: 'campaign.sent',
        timestamp: '2024-01-15T10:30:00Z',
        data: {
          campaign: {
            id: 1,
            uuid: 'campaign-uuid',
            name: 'Welcome Email',
            subject: 'Welcome!',
          },
          subscriber_count: 100,
        },
      };

      const result = parseWebhookEvent(payload) as CampaignSentEvent;

      expect(result.event).toBe('campaign.sent');
      expect(result.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(result.data.campaign.id).toBe(1);
      expect(result.data.campaign.name).toBe('Welcome Email');
      expect(result.data.subscriber_count).toBe(100);
    });

    it('should throw error for missing campaign id', () => {
      const payload = {
        event: 'campaign.sent',
        timestamp: '2024-01-15T10:30:00Z',
        data: {
          campaign: {
            uuid: 'campaign-uuid',
          },
          subscriber_count: 100,
        },
      };

      expect(() => parseWebhookEvent(payload)).toThrow(ListmonkError);
    });
  });

  describe('subscriber.opened', () => {
    it('should parse subscriber opened event', () => {
      const payload = {
        event: 'subscriber.opened',
        timestamp: '2024-01-15T11:00:00Z',
        data: {
          campaign: {
            id: 1,
            uuid: 'campaign-uuid',
            name: 'Welcome Email',
          },
          subscriber: {
            id: 42,
            email: 'test@example.com',
            uuid: 'subscriber-uuid',
          },
        },
      };

      const result = parseWebhookEvent(payload) as SubscriberOpenedEvent;

      expect(result.event).toBe('subscriber.opened');
      expect(result.data.subscriber.email).toBe('test@example.com');
      expect(result.data.subscriber.id).toBe(42);
      expect(result.data.campaign.id).toBe(1);
    });

    it('should throw error for missing subscriber id', () => {
      const payload = {
        event: 'subscriber.opened',
        timestamp: '2024-01-15T11:00:00Z',
        data: {
          campaign: { id: 1, uuid: 'uuid', name: 'Test' },
          subscriber: {
            email: 'test@example.com',
          },
        },
      };

      expect(() => parseWebhookEvent(payload)).toThrow(ListmonkError);
    });
  });

  describe('subscriber.clicked', () => {
    it('should parse subscriber clicked event', () => {
      const payload = {
        event: 'subscriber.clicked',
        timestamp: '2024-01-15T11:05:00Z',
        data: {
          campaign: {
            id: 1,
            uuid: 'campaign-uuid',
            name: 'Welcome Email',
          },
          subscriber: {
            id: 42,
            email: 'test@example.com',
            uuid: 'subscriber-uuid',
          },
          link: 'https://example.com/offer',
        },
      };

      const result = parseWebhookEvent(payload) as SubscriberClickedEvent;

      expect(result.event).toBe('subscriber.clicked');
      expect(result.data.link).toBe('https://example.com/offer');
      expect(result.data.subscriber.id).toBe(42);
    });
  });

  describe('subscriber.unsubscribed', () => {
    it('should parse subscriber unsubscribed event with campaign', () => {
      const payload = {
        event: 'subscriber.unsubscribed',
        timestamp: '2024-01-15T11:10:00Z',
        data: {
          campaign: {
            id: 1,
            uuid: 'campaign-uuid',
            name: 'Welcome Email',
          },
          subscriber: {
            id: 42,
            email: 'test@example.com',
            uuid: 'subscriber-uuid',
          },
          reason: 'No longer interested',
        },
      };

      const result = parseWebhookEvent(payload) as SubscriberUnsubscribedEvent;

      expect(result.event).toBe('subscriber.unsubscribed');
      expect(result.data.reason).toBe('No longer interested');
      expect(result.data.campaign?.id).toBe(1);
    });

    it('should parse subscriber unsubscribed event without campaign', () => {
      const payload = {
        event: 'subscriber.unsubscribed',
        timestamp: '2024-01-15T11:10:00Z',
        data: {
          subscriber: {
            id: 42,
            email: 'test@example.com',
            uuid: 'subscriber-uuid',
          },
        },
      };

      const result = parseWebhookEvent(payload) as SubscriberUnsubscribedEvent;

      expect(result.event).toBe('subscriber.unsubscribed');
      expect(result.data.campaign).toBeUndefined();
    });
  });

  describe('subscriber.bounced', () => {
    it('should parse hard bounce event', () => {
      const payload = {
        event: 'subscriber.bounced',
        timestamp: '2024-01-15T11:15:00Z',
        data: {
          campaign: {
            id: 1,
            uuid: 'campaign-uuid',
            name: 'Welcome Email',
          },
          subscriber: {
            id: 42,
            email: 'invalid@example.com',
            uuid: 'subscriber-uuid',
          },
          bounce_type: 'hard',
          error: 'Invalid email address',
        },
      };

      const result = parseWebhookEvent(payload) as SubscriberBouncedEvent;

      expect(result.event).toBe('subscriber.bounced');
      expect(result.data.bounce_type).toBe('hard');
      expect(result.data.error).toBe('Invalid email address');
    });

    it('should parse soft bounce event', () => {
      const payload = {
        event: 'subscriber.bounced',
        timestamp: '2024-01-15T11:15:00Z',
        data: {
          campaign: {
            id: 1,
            uuid: 'campaign-uuid',
            name: 'Welcome Email',
          },
          subscriber: {
            id: 42,
            email: 'temp@example.com',
            uuid: 'subscriber-uuid',
          },
          bounce_type: 'soft',
        },
      };

      const result = parseWebhookEvent(payload) as SubscriberBouncedEvent;

      expect(result.event).toBe('subscriber.bounced');
      expect(result.data.bounce_type).toBe('soft');
    });
  });

  describe('validation', () => {
    it('should throw error for invalid payload structure', () => {
      const payload = {
        event: 'campaign.sent',
        // missing timestamp and data
      };

      expect(() => parseWebhookEvent(payload)).toThrow(ListmonkError);
    });

    it('should throw error for invalid timestamp', () => {
      const payload = {
        event: 'campaign.sent',
        timestamp: 'not-a-timestamp',
        data: { campaign: { id: 1 }, subscriber_count: 100 },
      };

      expect(() => parseWebhookEvent(payload)).toThrow(ListmonkError);
    });

    it('should return null for unsupported event type', () => {
      const payload = {
        event: 'unknown.event',
        timestamp: '2024-01-15T10:30:00Z',
        data: {},
      };

      const result = parseWebhookEvent(payload);
      expect(result).toBeNull();
    });
  });
});

describe('mapToGenMailAnalyticsEvent', () => {
  it('should map campaign.sent to SENT', () => {
    const listmonkEvent: CampaignSentEvent = {
      event: 'campaign.sent',
      timestamp: '2024-01-15T10:30:00Z',
      data: {
        campaign: { id: 1, uuid: 'uuid', name: 'Test', subject: 'Test' },
        subscriber_count: 100,
      },
    };

    const result = mapToGenMailAnalyticsEvent(listmonkEvent, 'lead-123', 'email-456');

    expect(result.type).toBe('SENT');
    expect(result.leadId).toBe('lead-123');
    expect(result.generatedEmailId).toBe('email-456');
    expect(result.metadata.subscriberCount).toBe(100);
  });

  it('should map subscriber.opened to OPENED', () => {
    const listmonkEvent: SubscriberOpenedEvent = {
      event: 'subscriber.opened',
      timestamp: '2024-01-15T11:00:00Z',
      data: {
        campaign: { id: 1, uuid: 'uuid', name: 'Test' },
        subscriber: { id: 42, email: 'test@example.com', uuid: 'uuid' },
      },
    };

    const result = mapToGenMailAnalyticsEvent(listmonkEvent, 'lead-123', 'email-456');

    expect(result.type).toBe('OPENED');
    expect(result.metadata.campaignId).toBe(1);
    expect(result.metadata.subscriberId).toBe(42);
  });

  it('should map subscriber.clicked to CLICKED', () => {
    const listmonkEvent: SubscriberClickedEvent = {
      event: 'subscriber.clicked',
      timestamp: '2024-01-15T11:05:00Z',
      data: {
        campaign: { id: 1, uuid: 'uuid', name: 'Test' },
        subscriber: { id: 42, email: 'test@example.com', uuid: 'uuid' },
        link: 'https://example.com',
      },
    };

    const result = mapToGenMailAnalyticsEvent(listmonkEvent, 'lead-123');

    expect(result.type).toBe('CLICKED');
    expect(result.metadata.link).toBe('https://example.com');
    expect(result.generatedEmailId).toBeUndefined();
  });

  it('should map subscriber.unsubscribed to UNSUBSCRIBED', () => {
    const listmonkEvent: SubscriberUnsubscribedEvent = {
      event: 'subscriber.unsubscribed',
      timestamp: '2024-01-15T11:10:00Z',
      data: {
        subscriber: { id: 42, email: 'test@example.com', uuid: 'uuid' },
        reason: 'Spam',
      },
    };

    const result = mapToGenMailAnalyticsEvent(listmonkEvent, 'lead-123', 'email-456');

    expect(result.type).toBe('UNSUBSCRIBED');
    expect(result.metadata.reason).toBe('Spam');
  });

  it('should map subscriber.bounced to BOUNCED', () => {
    const listmonkEvent: SubscriberBouncedEvent = {
      event: 'subscriber.bounced',
      timestamp: '2024-01-15T11:15:00Z',
      data: {
        campaign: { id: 1, uuid: 'uuid', name: 'Test' },
        subscriber: { id: 42, email: 'test@example.com', uuid: 'uuid' },
        bounce_type: 'hard',
        error: 'Invalid email',
      },
    };

    const result = mapToGenMailAnalyticsEvent(listmonkEvent, 'lead-123', 'email-456');

    expect(result.type).toBe('BOUNCED');
    expect(result.metadata.bounceType).toBe('hard');
    expect(result.metadata.error).toBe('Invalid email');
  });

  it('should throw error for unknown event type', () => {
    const unknownEvent = {
      event: 'unknown.type',
      timestamp: '2024-01-15T11:15:00Z',
      data: {},
    } as unknown as CampaignSentEvent;

    expect(() => mapToGenMailAnalyticsEvent(unknownEvent, 'lead-123')).toThrow(ListmonkError);
  });
});

describe('parseWebhookBatch', () => {
  it('should parse multiple events', () => {
    const payloads = [
      {
        event: 'campaign.sent',
        timestamp: '2024-01-15T10:30:00Z',
        data: {
          campaign: { id: 1, uuid: 'uuid', name: 'Test', subject: 'Test' },
          subscriber_count: 100,
        },
      },
      {
        event: 'subscriber.opened',
        timestamp: '2024-01-15T11:00:00Z',
        data: {
          campaign: { id: 1, uuid: 'uuid', name: 'Test' },
          subscriber: { id: 42, email: 'test@example.com', uuid: 'uuid' },
        },
      },
    ];

    const result = parseWebhookBatch(payloads);

    expect(result.events).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.events[0].event).toBe('campaign.sent');
    expect(result.events[1].event).toBe('subscriber.opened');
  });

  it('should handle invalid events in batch', () => {
    const payloads = [
      {
        event: 'campaign.sent',
        timestamp: '2024-01-15T10:30:00Z',
        data: {
          campaign: { id: 1, uuid: 'uuid', name: 'Test', subject: 'Test' },
          subscriber_count: 100,
        },
      },
      {
        event: 'subscriber.opened',
        timestamp: 'invalid-timestamp',
        data: {},
      },
      {
        // Missing required fields
        event: 'campaign.sent',
      },
    ];

    const result = parseWebhookBatch(payloads);

    expect(result.events).toHaveLength(1);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].index).toBe(1);
    expect(result.errors[1].index).toBe(2);
  });

  it('should skip unsupported events without error', () => {
    const payloads = [
      {
        event: 'campaign.sent',
        timestamp: '2024-01-15T10:30:00Z',
        data: {
          campaign: { id: 1, uuid: 'uuid', name: 'Test', subject: 'Test' },
          subscriber_count: 100,
        },
      },
      {
        event: 'unknown.event',
        timestamp: '2024-01-15T10:30:00Z',
        data: {},
      },
    ];

    const result = parseWebhookBatch(payloads);

    expect(result.events).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });
});
