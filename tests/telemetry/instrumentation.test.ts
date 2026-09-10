import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, onRequestError } from '@/instrumentation';
import * as telemetry from '@/lib/telemetry';

describe('Next.js 16 Instrumentation Error Reporting', () => {
  let logErrorSpy: any;
  let flushTelemetrySpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    logErrorSpy = vi.spyOn(telemetry, 'logError').mockResolvedValue('msg-err-id');
    flushTelemetrySpy = vi.spyOn(telemetry, 'flushTelemetry').mockResolvedValue(undefined);
  });

  describe('register()', () => {
    it('initializes instrumentation and registers termination handlers', async () => {
      const processOnSpy = vi.spyOn(process, 'on');
      await register();
      expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });

  describe('onRequestError()', () => {
    it('captures standard Error instances and forwards them to logError', async () => {
      const error = new Error('Database connection failed');
      const request = {
        path: '/api/articles',
        method: 'POST',
        headers: {
          'x-trace-id': 'req-err-trace-123',
        },
      };
      const context = {
        routerKind: 'App Router' as const,
        routeType: 'route' as const,
        renderSource: 'server-component' as const,
      };

      await onRequestError(error, request as any, context as any);

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database connection failed',
          name: 'Error',
          path: '/api/articles',
          routerKind: 'App Router',
          routeType: 'route',
        }),
        expect.objectContaining({
          traceId: 'req-err-trace-123',
        })
      );
    });

    it('captures non-Error objects with digest and generates a fallback traceId', async () => {
      const error = {
        digest: 'NEXT_DIGEST_4567',
        message: 'Rendering failed',
      };
      const request = {
        path: '/articles/my-slug',
        method: 'GET',
        headers: {},
      };
      const context = {
        routerKind: 'Pages Router' as const,
        routeType: 'render' as const,
      };

      await onRequestError(error as any, request as any, context as any);

      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Rendering failed',
          digest: 'NEXT_DIGEST_4567',
          path: '/articles/my-slug',
        }),
        expect.objectContaining({
          traceId: expect.any(String),
        })
      );
    });
  });
});
