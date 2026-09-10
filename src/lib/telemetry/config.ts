export interface TelemetryConfig {
  projectId?: string;
  topicName?: string;
  logToConsole: boolean;
  service: string;
  environment: string;
}

export function getTelemetryConfig(): TelemetryConfig {
  const environment = process.env.NODE_ENV || 'development';
  const service = process.env.SERVICE_NAME || 'modern-app';
  const projectId = process.env.PUBSUB_PROJECT_ID;
  const topicName = process.env.PUBSUB_TOPIC_NAME;

  let logToConsole = environment !== 'production';
  if (process.env.TELEMETRY_LOG_TO_CONSOLE !== undefined) {
    logToConsole = process.env.TELEMETRY_LOG_TO_CONSOLE === 'true';
  }

  return {
    projectId,
    topicName,
    logToConsole,
    service,
    environment,
  };
}
