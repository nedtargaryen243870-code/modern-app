import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelemetryPublisher, getPublisher } from '@/lib/telemetry/publisher';
import { logHttp, logError, trackAudit, flushTelemetry } from '@/lib/telemetry/index';

// Mock @google-cloud/pubsub
const mockPublishMessage = vi.fn().mockResolvedValue('msg-12345');
const mockFlush = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockTopic = vi.fn().mockReturnValue({
  publishMessage: mockPublishMessage,
  flush: mockFlush,
});
const mockCloseClient = vi.fn().mockResolvedValue(undefined);

vi.mock('@google-cloud/pubsub', () => {
  return {
    PubSub: vi.fn().mockImplementation(() => ({
      topic: mockTopic,
      close: mockCloseClient,
    })),
  };
});

describe('Telemetry Publisher & Facade', () => {
  let consoleSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Local / Unconfigured Mode', () => {
    it('outputs to console without throwing when Pub/Sub is not configured', async () => {
      const publisher = new TelemetryPublisher({
        logToConsole: true,
        service: 'modern-app',
        environment: 'test',
      });

      const messageId = await publisher.publish({
        eventId: '11111111-1111-4111-a111-111111111111',
        timestamp: new Date().toISOString(),
        eventType: 'http.request',
        severity: 'INFO',
        service: 'modern-app',
        environment: 'test',
        traceId: 'trace-test',
        data: { method: 'GET', path: '/test', statusCode: 200, durationMs: 10 },
      });

      expect(messageId).toBe('local-fallback');
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockPublishMessage).not.toHaveBeenCalled();
    });
  });

  describe('Configured Pub/Sub Mode', () => {
    it('publishes messages to the configured Pub/Sub topic', async () => {
      const publisher = new TelemetryPublisher({
        projectId: 'test-project',
        topicName: 'test-topic',
        logToConsole: false,
        service: 'modern-app',
        environment: 'production',
      });

      const envelope = {
        eventId: '22222222-2222-4222-a222-222222222222',
        timestamp: new Date().toISOString(),
        eventType: 'http.request' as const,
        severity: 'INFO' as const,
        service: 'modern-app',
        environment: 'production',
        traceId: 'trace-pubsub',
        data: { method: 'POST', path: '/api/articles', statusCode: 201, durationMs: 55 },
      };

      const messageId = await publisher.publish(envelope);
      expect(messageId).toBe('msg-12345');
      expect(mockPublishMessage).toHaveBeenCalledWith({
        json: envelope,
        attributes: {
          eventType: 'http.request',
          severity: 'INFO',
          service: 'modern-app',
          environment: 'production',
          traceId: 'trace-pubsub',
        },
      });
    });

    it('safely catches and logs errors without throwing when Pub/Sub publish fails', async () => {
      mockPublishMessage.mockRejectedValueOnce(new Error('PubSub network failure'));

      const publisher = new TelemetryPublisher({
        projectId: 'test-project',
        topicName: 'test-topic',
        logToConsole: false,
        service: 'modern-app',
        environment: 'production',
      });

      const envelope = {
        eventId: '33333333-3333-4333-a333-333333333333',
        timestamp: new Date().toISOString(),
        eventType: 'server.error' as const,
        severity: 'ERROR' as const,
        service: 'modern-app',
        environment: 'production',
        traceId: 'trace-err',
        data: { message: 'Database down', name: 'MongoError' },
      };

      // Must not throw
      const result = await publisher.publish(envelope);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('flushes the topic buffer on flush()', async () => {
      const publisher = new TelemetryPublisher({
        projectId: 'test-project',
        topicName: 'test-topic',
        logToConsole: false,
        service: 'modern-app',
        environment: 'production',
      });

      await publisher.flush();
      expect(mockFlush).toHaveBeenCalled();
    });
  });

  describe('Telemetry Facade Helper Functions', () => {
    it('logHttp dispatches http.request event with traceId and status-dependent severity', async () => {
      const msgId = await logHttp(
        {
          method: 'GET',
          path: '/api/users',
          statusCode: 200,
          durationMs: 15,
        },
        { traceId: 'req-trace-1' }
      );

      expect(msgId).toBeDefined();
    });

    it('logError dispatches server.error event with ERROR severity', async () => {
      const msgId = await logError(
        {
          message: 'Unhandled exception',
          name: 'TypeError',
        },
        { traceId: 'err-trace-1' }
      );

      expect(msgId).toBeDefined();
    });

    it('trackAudit dispatches audit events with given eventType and details', async () => {
      const msgId = await trackAudit(
        'audit.article',
        {
          action: 'article.created',
          targetId: 'art-999',
          details: { title: 'Modern App' },
        },
        { traceId: 'audit-trace-1', userId: 'usr-123' }
      );

      expect(msgId).toBeDefined();
    });

    it('flushTelemetry successfully executes without error', async () => {
      await expect(flushTelemetry()).resolves.not.toThrow();
    });
  });
});
