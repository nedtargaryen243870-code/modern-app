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
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware';
    renderSource?: 'react-server-components' | 'react-server-components-payload' | 'server-side-rendering';
    revalidateReason?: 'on-demand' | 'stale' | 'expr' | string;
    renderType?: 'dynamic' | 'dynamic-resume';
  }
) => {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as any).message)
      : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  const name = err instanceof Error ? err.name : 'ServerError';
  const digest =
    typeof err === 'object' && err !== null && 'digest' in err
      ? String((err as any).digest)
      : undefined;

  // Extract trace ID from request headers or fallback to generated ID
  const traceIdHeader = request?.headers?.['x-trace-id'];
  const traceId =
    (Array.isArray(traceIdHeader) ? traceIdHeader[0] : traceIdHeader) ||
    `trace-${Date.now()}`;

  await logError(
    {
      message,
      stack,
      name,
      digest,
      routerKind: context?.routerKind,
      routeType: context?.routeType,
      path: request?.path,
    },
    { traceId }
  );
};
