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
  data: AuditPayload,
  context?: { traceId?: string; userId?: string }
): Promise<string | null>;
export async function trackAudit(
  eventType: EventType,
  data: AuditPayload,
  context?: { traceId?: string; userId?: string }
): Promise<string | null>;
export async function trackAudit(
  eventTypeOrData: EventType | AuditPayload,
  dataOrContext?: AuditPayload | { traceId?: string; userId?: string },
  maybeContext?: { traceId?: string; userId?: string }
): Promise<string | null> {
  let eventType: EventType;
  let data: AuditPayload;
  let context: { traceId?: string; userId?: string } | undefined;

  if (typeof eventTypeOrData === 'string') {
    eventType = eventTypeOrData;
    data = dataOrContext as AuditPayload;
    context = maybeContext;
  } else {
    data = eventTypeOrData;
    context = dataOrContext as { traceId?: string; userId?: string } | undefined;
    const resType = data.resourceType;
    eventType = (resType ? `audit.${resType}` : 'audit.auth') as EventType;
  }

  const traceId = context?.traceId || `trace-${Date.now()}`;
  const userId = context?.userId || data.userId;
  const severity: EventSeverity = data.status === 'failure' ? 'WARN' : 'INFO';

  const envelope = createTelemetryEnvelope<AuditPayload>({
    eventType,
    severity,
    traceId,
    userId,
    data,
  });

  return getPublisher().publish(envelope);
}

export async function flushTelemetry(): Promise<void> {
  return getPublisher().flush();
}
