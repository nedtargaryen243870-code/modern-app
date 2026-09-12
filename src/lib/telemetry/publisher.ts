import { PubSub, Topic } from '@google-cloud/pubsub';
import { getTelemetryConfig, TelemetryConfig } from './config';
import { TelemetryEnvelope } from './schema';

export class TelemetryPublisher {
  private config: TelemetryConfig;
  private pubsubClient: PubSub | null = null;
  private topic: Topic | null = null;

  constructor(customConfig?: Partial<TelemetryConfig>) {
    this.config = { ...getTelemetryConfig(), ...customConfig };

    if (this.config.projectId && this.config.topicName) {
      try {
        this.pubsubClient = new PubSub({ projectId: this.config.projectId });
        this.topic = this.pubsubClient.topic(this.config.topicName, {
          batching: {
            maxMessages: 100,
            maxMilliseconds: 50,
          },
        });
      } catch (err) {
        console.error('[Telemetry] Failed to initialize Pub/Sub client:', err);
      }
    }
  }

  isConfigured(): boolean {
    return Boolean(this.topic);
  }

  async publish<T = Record<string, unknown>>(
    envelope: TelemetryEnvelope<T>
  ): Promise<string | null> {
    try {
      // Console fallback logging if enabled
      if (this.config.logToConsole) {
        const logFn =
          envelope.severity === 'ERROR' || envelope.severity === 'CRITICAL'
            ? console.error
            : console.log;
        logFn(
          `[Telemetry] [${envelope.severity}] [${envelope.eventType}]`,
          JSON.stringify(envelope)
        );
      }

      // If PubSub is not configured, return local-fallback
      if (!this.topic) {
        return 'local-fallback';
      }

      // BigQuery direct subscriptions with JSON columns require the payload
      // for the JSON field to be a valid JSON-encoded string, and table columns
      // use snake_case identifiers.
      const serializedData =
        typeof envelope.data === 'string'
          ? envelope.data
          : JSON.stringify(envelope.data ?? {});

      const payload = {
        // BigQuery table schema mappings (snake_case)
        event_id: envelope.eventId,
        timestamp: envelope.timestamp,
        event_type: envelope.eventType,
        severity: envelope.severity,
        service: envelope.service,
        environment: envelope.environment,
        trace_id: envelope.traceId ?? null,
        user_id: envelope.userId ?? null,
        data: serializedData,

        // Preserve original envelope keys (camelCase)
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        traceId: envelope.traceId,
        userId: envelope.userId,
      };

      const messageId = await this.topic.publishMessage({
        json: payload,
        attributes: {
          eventType: envelope.eventType,
          severity: envelope.severity,
          service: envelope.service,
          environment: envelope.environment,
          ...(envelope.traceId ? { traceId: envelope.traceId } : {}),
        },
      });
      return messageId;
    } catch (err) {
      console.error('[Telemetry] Error publishing event to Pub/Sub:', err);
      return null;
    }
  }

  async flush(): Promise<void> {
    if (this.topic && typeof this.topic.flush === 'function') {
      try {
        await this.topic.flush();
      } catch (err) {
        console.error('[Telemetry] Error flushing Pub/Sub topic:', err);
      }
    }
  }

  async close(): Promise<void> {
    await this.flush();
    if (this.pubsubClient && typeof this.pubsubClient.close === 'function') {
      try {
        await this.pubsubClient.close();
      } catch (err) {
        console.error('[Telemetry] Error closing Pub/Sub client:', err);
      }
    }
  }
}

let publisherInstance: TelemetryPublisher | null = null;

export function getPublisher(): TelemetryPublisher {
  if (!publisherInstance) {
    publisherInstance = new TelemetryPublisher();
  }
  return publisherInstance;
}
