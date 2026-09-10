import { describe, it, expect } from 'vitest';
import {
  TelemetryEnvelopeSchema,
  HttpRequestPayloadSchema,
  ServerErrorPayloadSchema,
  AuditPayloadSchema,
  createTelemetryEnvelope,
} from '@/lib/telemetry/schema';
import { getTelemetryConfig } from '@/lib/telemetry/config';

describe('Telemetry Schema & Envelope Validation', () => {
  describe('Payload Schemas', () => {
    it('validates a valid HttpRequestPayload', () => {
      const payload = {
        method: 'GET',
        path: '/api/articles',
        statusCode: 200,
        durationMs: 42.5,
        userAgent: 'Mozilla/5.0',
        ip: '127.0.0.1',
        referer: 'http://localhost:3000',
      };
      const result = HttpRequestPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.method).toBe('GET');
        expect(result.data.statusCode).toBe(200);
      }
    });

    it('rejects invalid HttpRequestPayload missing required fields', () => {
      const invalid = {
        method: 'GET',
        // missing path, statusCode, durationMs
      };
      const result = HttpRequestPayloadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates a valid ServerErrorPayload', () => {
      const payload = {
        message: 'Something went wrong',
        name: 'DatabaseError',
        stack: 'Error: Something went wrong\n  at ...',
        digest: '1234567890',
        context: {
          routerKind: 'App Router',
          routePath: '/api/articles',
          routeType: 'route',
        },
      };
      const result = ServerErrorPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('validates a valid AuditPayload', () => {
      const payload = {
        action: 'article.created',
        targetId: 'art-12345',
        details: { title: 'Test Article', tags: ['news', 'tech'] },
      };
      const result = AuditPayloadSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('TelemetryEnvelopeSchema', () => {
    it('validates a complete TelemetryEnvelope', () => {
      const envelope = {
        eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        timestamp: new Date().toISOString(),
        eventType: 'http.request',
        severity: 'INFO',
        service: 'modern-app',
        environment: 'test',
        traceId: 'trace-xyz-123',
        userId: 'user-456',
        data: {
          method: 'GET',
          path: '/api/articles',
          statusCode: 200,
          durationMs: 12,
        },
      };

      const result = TelemetryEnvelopeSchema.safeParse(envelope);
      expect(result.success).toBe(true);
    });

    it('rejects an envelope with an invalid eventId format (not uuid)', () => {
      const envelope = {
        eventId: 'invalid-id-not-uuid',
        timestamp: new Date().toISOString(),
        eventType: 'http.request',
        severity: 'INFO',
        service: 'modern-app',
        environment: 'test',
        traceId: 'trace-xyz-123',
        data: {},
      };

      const result = TelemetryEnvelopeSchema.safeParse(envelope);
      expect(result.success).toBe(false);
    });

    it('rejects an envelope with an invalid severity', () => {
      const envelope = {
        eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        timestamp: new Date().toISOString(),
        eventType: 'http.request',
        severity: 'UNKNOWN_SEVERITY',
        service: 'modern-app',
        environment: 'test',
        traceId: 'trace-xyz-123',
        data: {},
      };

      const result = TelemetryEnvelopeSchema.safeParse(envelope);
      expect(result.success).toBe(false);
    });
  });

  describe('createTelemetryEnvelope Helper', () => {
    it('generates valid envelope with auto-assigned eventId and timestamp', () => {
      const envelope = createTelemetryEnvelope({
        eventType: 'audit.article',
        severity: 'INFO',
        traceId: 'trace-abc-789',
        userId: 'user-1',
        data: {
          action: 'article.created',
          targetId: 'art-1',
        },
      });

      expect(envelope.eventId).toBeDefined();
      expect(envelope.timestamp).toBeDefined();
      expect(envelope.service).toBe('modern-app');
      expect(envelope.eventType).toBe('audit.article');
      expect(envelope.traceId).toBe('trace-abc-789');

      const validated = TelemetryEnvelopeSchema.safeParse(envelope);
      expect(validated.success).toBe(true);
    });
  });

  describe('Telemetry Config', () => {
    it('returns default configuration values when env vars are not set', () => {
      const config = getTelemetryConfig();
      expect(config.service).toBe('modern-app');
      expect(config.environment).toBeDefined();
      expect(typeof config.logToConsole).toBe('boolean');
    });

    it('correctly parses environment overrides', () => {
      const originalProject = process.env.PUBSUB_PROJECT_ID;
      const originalTopic = process.env.PUBSUB_TOPIC_NAME;
      const originalConsole = process.env.TELEMETRY_LOG_TO_CONSOLE;

      try {
        process.env.PUBSUB_PROJECT_ID = 'test-project-123';
        process.env.PUBSUB_TOPIC_NAME = 'test-telemetry-topic';
        process.env.TELEMETRY_LOG_TO_CONSOLE = 'true';

        const config = getTelemetryConfig();
        expect(config.projectId).toBe('test-project-123');
        expect(config.topicName).toBe('test-telemetry-topic');
        expect(config.logToConsole).toBe(true);
      } finally {
        if (originalProject !== undefined) process.env.PUBSUB_PROJECT_ID = originalProject;
        else delete process.env.PUBSUB_PROJECT_ID;

        if (originalTopic !== undefined) process.env.PUBSUB_TOPIC_NAME = originalTopic;
        else delete process.env.PUBSUB_TOPIC_NAME;

        if (originalConsole !== undefined) process.env.TELEMETRY_LOG_TO_CONSOLE = originalConsole;
        else delete process.env.TELEMETRY_LOG_TO_CONSOLE;
      }
    });
  });
});
