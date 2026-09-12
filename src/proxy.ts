import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { logHttp } from '@/lib/telemetry';

export async function proxy(request: NextRequest) {
  const startTime = Date.now();
  const rawTraceId =
    request.headers.get('x-trace-id') ||
    request.headers.get('x-cloud-trace-context')?.split('/')[0];
  // Sanitize incoming trace ID to alphanumeric, dash, slash, underscore (max 128 chars)
  const traceId =
    rawTraceId && /^[a-zA-Z0-9_\-/.]{1,128}$/.test(rawTraceId)
      ? rawTraceId
      : uuidv4();

  // Clone request headers and add x-trace-id
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-trace-id', traceId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('x-trace-id', traceId);

  const durationMs = Date.now() - startTime;
  const path = request.nextUrl?.pathname || new URL(request.url).pathname;
  const method = request.method;
  const userAgent = request.headers.get('user-agent') || undefined;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || undefined;

  // Asynchronously log without blocking response
  logHttp(
    {
      method,
      path,
      statusCode: response.status,
      durationMs,
      userAgent,
      ip,
    },
    { traceId }
  ).catch((err) => {
    console.error('[Telemetry] Proxy logHttp error:', err);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
