import {
  HttpRequestPayload,
  ServerErrorPayload,
  AuditPayload,
  EventType,
  EventSeverity,
  createTelemetryEnvelope,
  CreateTelemetryEnvelopeParams,
  TelemetryEnvelope,
} from './schema';
import { getPublisher, TelemetryPublisher } from './publisher';

export * from './schema';
export * from './config';
export * from './publisher';

export async function trackEvent<T = Record<string, unknown>>(
  params: CreateTelemetryEnvelopeParams<T>
): Promise<string | null> {
  const envelope = createTelemetryEnvelope(params);
  return getPublisher().publish(envelope);
}

export async function logHttp(
  data: HttpRequestPayload,
  context?: { traceId?: string; userId?: string }
): Promise<string | null> {
  let severity: EventSeverity = 'INFO';
  if (data.statusCode >= 500) {
    severity = 'ERROR';
  } else if (data.statusCode >= 400) {
    severity = 'WARN';
  }

  const traceId = context?.traceId || `trace-${Date.now()}`;

  const envelope = createTelemetryEnvelope<HttpRequestPayload>({
    eventType: 'http.request',
    severity,
    traceId,
    userId: context?.userId,
    data,
  });

  return getPublisher().publish(envelope);
}

export async function logError(
  data: ServerErrorPayload,
  context?: { traceId?: string; userId?: string }
): Promise<string | null> {
  const traceId = context?.traceId || `trace-${Date.now()}`;

  const envelope = createTelemetryEnvelope<ServerErrorPayload>({
    eventType: 'server.error',
    severity: 'ERROR',
    traceId,
    userId: context?.userId,
    data,
  });

  return getPublisher().publish(envelope);
}

export async function trackAudit(
  eventType: EventType,
  data: AuditPayload,
  context?: { traceId?: string; userId?: string }
): Promise<string | null> {
  const traceId = context?.traceId || `trace-${Date.now()}`;

  const envelope = createTelemetryEnvelope<AuditPayload>({
    eventType,
    severity: 'INFO',
    traceId,
    userId: context?.userId,
    data,
  });

  return getPublisher().publish(envelope);
}

export async function flushTelemetry(): Promise<void> {
  return getPublisher().flush();
}
