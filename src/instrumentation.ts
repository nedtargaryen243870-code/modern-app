import type { Instrumentation } from 'next';
import { logError, flushTelemetry } from '@/lib/telemetry';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || typeof process.on === 'function') {
    const handleShutdown = async (signal: string) => {
      console.log(`[Telemetry] Received ${signal}. Flushing pending events...`);
      try {
        await flushTelemetry();
      } catch (err) {
        console.error('[Telemetry] Error flushing telemetry on shutdown:', err);
      }
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as Record<string, unknown>).message)
      : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  const name = err instanceof Error ? err.name : 'ServerError';
  const digest =
    typeof err === 'object' && err !== null && 'digest' in err
      ? String((err as Record<string, unknown>).digest)
      : undefined;

  // Extract trace ID from request headers or fallback to generated ID
  const traceIdHeader = request?.headers?.['x-trace-id'];
  const traceId =
    (Array.isArray(traceIdHeader) ? traceIdHeader[0] : traceIdHeader) ||
    `trace-${Date.now()}`;

  try {
    await logError(
      {
        message,
        stack,
        name,
        digest,
        path: request?.path,
        routerKind: context?.routerKind,
        routeType: context?.routeType,
        context: {
          routerKind: context?.routerKind,
          routePath: context?.routePath,
          routeType: context?.routeType,
        },
      },
      { traceId }
    );
  } catch (logErr) {
    console.error('[Telemetry] Failed to record error in instrumentation:', logErr);
  }
};
