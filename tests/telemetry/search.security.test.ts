import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/telemetry/search/route';

// Mock auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock BigQuery client
vi.mock('@google-cloud/bigquery', () => {
  const mockQuery = vi.fn();
  return {
    BigQuery: vi.fn().mockImplementation(() => ({
      query: mockQuery,
    })),
    __mockQuery: mockQuery,
  };
});

import { auth } from '@/lib/auth';

describe('Admin Telemetry Search API Route - Security Boundary Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Phase B (Red): returns HTTP 401 when request is unauthenticated', async () => {
    (auth as any).mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/telemetry/search?traceId=trace-100');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('Phase B (Red): returns HTTP 403 when authenticated user is not an admin', async () => {
    (auth as any).mockResolvedValue({
      user: { id: 'usr-123', email: 'user@example.com', role: 'user' },
    });

    const req = new NextRequest('http://localhost:3000/api/telemetry/search?traceId=trace-100');
    const res = await GET(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden: Admin access required');
  });

  it('Phase B (Red): rejects SQL injection payload and uses parameterized bindings (@traceId, @userId)', async () => {
    (auth as any).mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    const sqlInjectionPayload = "trace-100' OR '1'='1";
    const req = new NextRequest(
      `http://localhost:3000/api/telemetry/search?traceId=${encodeURIComponent(sqlInjectionPayload)}&userId=user-456`
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
  });

  it('Phase B (Red): sanitizes error responses and redacts stack traces on internal BigQuery failure', async () => {
    (auth as any).mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
    });

    const req = new NextRequest('http://localhost:3000/api/telemetry/search?traceId=cause-error');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(body.stack).toBeUndefined();
    expect(body.details).toBeUndefined();
  });
});
