import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export const EventSeveritySchema = z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']);
export type EventSeverity = z.infer<typeof EventSeveritySchema>;

export const EventTypeSchema = z.enum([
  'http.request',
  'server.error',
  'audit.auth',
  'audit.article',
  'audit.comment',
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const HttpRequestPayloadSchema = z.object({
  method: z.string(),
  path: z.string(),
  statusCode: z.number(),
  durationMs: z.number(),
  userAgent: z.string().optional(),
  ip: z.string().optional(),
  referer: z.string().optional(),
});
export type HttpRequestPayload = z.infer<typeof HttpRequestPayloadSchema>;

export const ServerErrorPayloadSchema = z.object({
  message: z.string(),
  name: z.string(),
  stack: z.string().optional(),
  digest: z.string().optional(),
  context: z
    .object({
      routerKind: z.string().optional(),
      routePath: z.string().optional(),
      routeType: z.string().optional(),
    })
    .optional(),
});
export type ServerErrorPayload = z.infer<typeof ServerErrorPayloadSchema>;

export const AuditPayloadSchema = z.object({
  action: z.string(),
  targetId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type AuditPayload = z.infer<typeof AuditPayloadSchema>;

export const TelemetryEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  eventType: EventTypeSchema,
  severity: EventSeveritySchema,
  service: z.string(),
  environment: z.string(),
  traceId: z.string(),
  userId: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

export type TelemetryEnvelope<T = Record<string, unknown>> = Omit<
  z.infer<typeof TelemetryEnvelopeSchema>,
  'data'
> & {
  data: T;
};

export interface CreateTelemetryEnvelopeParams<T = Record<string, unknown>> {
  eventType: EventType;
  severity: EventSeverity;
  traceId: string;
  userId?: string;
  service?: string;
  environment?: string;
  data: T;
}

export function createTelemetryEnvelope<T = Record<string, unknown>>({
  eventType,
  severity,
  traceId,
  userId,
  service = 'modern-app',
  environment = process.env.NODE_ENV || 'development',
  data,
}: CreateTelemetryEnvelopeParams<T>): TelemetryEnvelope<T> {
  const envelope: TelemetryEnvelope<T> = {
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    service,
    environment,
    traceId,
    ...(userId ? { userId } : {}),
    data,
  };

  return envelope;
}
