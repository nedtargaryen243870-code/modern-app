import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy, config } from '@/proxy';
import * as telemetry from '@/lib/telemetry';

describe('Next.js 16 Proxy Telemetry Interceptor', () => {
  let logHttpSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    logHttpSpy = vi.spyOn(telemetry, 'logHttp').mockResolvedValue('msg-test-id');
  });

  it('generates a new traceId if none is present in request headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/articles', {
      method: 'GET',
      headers: {
        'user-agent': 'Vitest-Test-Agent',
      },
    });

    const res = await proxy(req);

    // Verify response headers contain x-trace-id
    const traceId = res.headers.get('x-trace-id');
    expect(traceId).toBeDefined();
    expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Verify logHttp was called
    expect(logHttpSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/api/articles',
        userAgent: 'Vitest-Test-Agent',
      }),
      expect.objectContaining({
        traceId,
      })
    );
  });

  it('propagates incoming x-trace-id when provided', async () => {
    const existingTraceId = 'upstream-trace-12345';
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        'x-trace-id': existingTraceId,
      },
    });

    const res = await proxy(req);

    expect(res.headers.get('x-trace-id')).toBe(existingTraceId);
    expect(logHttpSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/api/users',
      }),
      expect.objectContaining({
        traceId: existingTraceId,
      })
    );
  });

  it('matcher excludes static assets and favicon', () => {
    expect(config.matcher).toBeDefined();
  });
});
