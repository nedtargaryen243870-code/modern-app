# Google Cloud Pub/Sub to BigQuery Telemetry Setup Guide

This guide describes how to configure Google Cloud Pub/Sub and BigQuery for direct, serverless telemetry ingestion from the modernized Next.js 16 application.

---

## 1. Architecture Overview

```
Next.js 16 App (modern-app)
  ├── Proxy (HTTP Request Telemetry)
  ├── Instrumentation (Uncaught Error Telemetry)
  └── API Routes (Domain Audit Telemetry)
           │
           ▼
  Google Cloud Pub/Sub Topic (`telemetry-events`)
           │
           ├───────────────────────────────┐
           ▼ (Direct BigQuery Ingestion)   ▼ (Dead Letter Queue on failure)
  BigQuery Table: `telemetry.app_events`  Pub/Sub Topic: `telemetry-events-dlq`
                                           └── BigQuery Table: `telemetry.app_events_dlq`
```

---

## 2. BigQuery DDL Schema

### 2.1 Main Telemetry Table: `telemetry.app_events`

Run the following SQL in BigQuery to create the partitioned and clustered telemetry table:

```sql
CREATE SCHEMA IF NOT EXISTS `YOUR_PROJECT_ID.telemetry`
OPTIONS (
  location = 'US'
);

CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.telemetry.app_events` (
  event_id STRING NOT NULL OPTIONS(description="Unique event UUID v4"),
  timestamp TIMESTAMP NOT NULL OPTIONS(description="UTC timestamp when event was recorded"),
  event_type STRING NOT NULL OPTIONS(description="Type of event: http.request, server.error, audit.auth, audit.article, audit.comment"),
  severity STRING NOT NULL OPTIONS(description="Event severity: DEBUG, INFO, WARN, ERROR, CRITICAL"),
  service STRING NOT NULL OPTIONS(description="Name of service generating event (modern-app)"),
  environment STRING NOT NULL OPTIONS(description="Deployment environment (production, staging, development, test)"),
  trace_id STRING OPTIONS(description="Correlation trace ID propagating across requests"),
  user_id STRING OPTIONS(description="Authenticated user ID if available"),
  data JSON NOT NULL OPTIONS(description="Structured JSON payload containing event specific details"),
  
  -- Pub/Sub ingestion metadata (added automatically by BigQuery subscription when write_metadata is enabled)
  publish_time TIMESTAMP OPTIONS(description="Pub/Sub message publish time"),
  subscription_name STRING OPTIONS(description="Name of the Pub/Sub subscription"),
  message_id STRING OPTIONS(description="Pub/Sub message ID"),
  attributes JSON OPTIONS(description="Pub/Sub message attributes")
)
PARTITION BY DATE(timestamp)
CLUSTER BY event_type, severity, environment
OPTIONS (
  description = "Application telemetry and structured audit logs ingested from Pub/Sub",
  require_partition_filter = FALSE
);
```

### 2.2 Dead-Letter Queue Table: `telemetry.app_events_dlq`

```sql
CREATE TABLE IF NOT EXISTS `YOUR_PROJECT_ID.telemetry.app_events_dlq` (
  message_id STRING NOT NULL,
  publish_time TIMESTAMP NOT NULL,
  data STRING,
  attributes JSON,
  subscription_name STRING
)
PARTITION BY DATE(publish_time)
OPTIONS (
  description = "Dead-letter queue table for invalid or unparseable telemetry messages"
);
```

---

## 3. Google Cloud Pub/Sub & IAM Configuration

### 3.1 Create Topics

```bash
# 1. Create main topic
gcloud pubsub topics create telemetry-events \
  --project="YOUR_PROJECT_ID"

# 2. Create dead-letter topic
gcloud pubsub topics create telemetry-events-dlq \
  --project="YOUR_PROJECT_ID"
```

### 3.2 Service Account Permissions

Grant the Google Cloud Pub/Sub service agent permission to insert into BigQuery:

```bash
# Obtain project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
PUBSUB_SERVICE_ACCOUNT="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"

# Grant BigQuery permissions to Pub/Sub Service Agent
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PUBSUB_SERVICE_ACCOUNT}" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PUBSUB_SERVICE_ACCOUNT}" \
  --role="roles/bigquery.metadataViewer"
```

### 3.3 Create Direct BigQuery Subscription

```bash
# 1. Create BigQuery subscription with metadata, dead-letter handling, and drop-unknown-fields
gcloud pubsub subscriptions create telemetry-events-bq-sub \
  --project="YOUR_PROJECT_ID" \
  --topic="telemetry-events" \
  --bigquery-table="YOUR_PROJECT_ID.telemetry.app_events" \
  --use-table-schema \
  --write-metadata \
  --drop-unknown-fields \
  --dead-letter-topic="telemetry-events-dlq" \
  --max-delivery-attempts=5

# 2. Create dead-letter BigQuery subscription
gcloud pubsub subscriptions create telemetry-events-dlq-bq-sub \
  --project="YOUR_PROJECT_ID" \
  --topic="telemetry-events-dlq" \
  --bigquery-table="YOUR_PROJECT_ID.telemetry.app_events_dlq" \
  --write-metadata
```

#### Updating an Existing Subscription
If the subscription already exists without `--drop-unknown-fields`, update it:
```bash
gcloud pubsub subscriptions update telemetry-events-bq-sub \
  --project="YOUR_PROJECT_ID" \
  --bigquery-table="YOUR_PROJECT_ID:telemetry.app_events" \
  --use-table-schema \
  --write-metadata \
  --drop-unknown-fields
```

### 3.4 BigQuery JSON Data Type Ingestion & Schema Rules

When streaming messages directly into BigQuery using `--use-table-schema`, Pub/Sub maps JSON message fields directly to corresponding BigQuery columns. Keep in mind the following Google Cloud requirements:

1. **JSON Column Stringification**:
   - When a BigQuery column has the `JSON` data type (e.g., the `data` column), Pub/Sub's direct ingestion driver requires the field value to be a **valid JSON-encoded string** (e.g. `"data": "{\"method\":\"POST\",\"path\":\"/...\"}"`), NOT an unescaped raw JSON object.
   - If an unescaped JSON object is passed, Pub/Sub fails with:
     `JSON Object: 'data' is incompatible with BigQuery field: 'data' of type: 'JSON'. To write data to a JSON field it must be a valid JSON string.`
   - In `TelemetryPublisher`, the application automatically serializes `envelope.data` to a valid JSON string before publishing, allowing BigQuery to parse and store it as native BigQuery JSON.
2. **Column Casing and `--drop-unknown-fields`**:
   - The BigQuery table schema uses standard SQL `snake_case` (`event_id`, `event_type`, `trace_id`, `user_id`).
   - If `--drop-unknown-fields` is omitted, any field in the message payload not present in the BigQuery table schema (such as `camelCase` properties) will cause ingestion failure: `JSON Field: 'eventId' not found in table schema`.
   - `TelemetryPublisher` provides standard `snake_case` column keys to map directly into BigQuery, while `--drop-unknown-fields` ensures that any auxiliary or client metadata won't trigger dead-letter retries.
3. **Table Schema vs Topic Schema**:
   - Pub/Sub supports either `--use-table-schema` (directly referencing BigQuery) or `--use-topic-schema` (requiring an Apache Avro or Protocol Buffers schema attached to the topic).
   - `--use-table-schema` is the recommended pattern because it provides native type inference directly from BigQuery without maintaining external Avro/Protobuf schemas. In Avro, `data` would also be defined as `"type": "string"`, requiring the exact same JSON-string encapsulation.

---

## 4. Application Configuration

Set the following environment variables in your deployment environment (e.g. Cloud Run, Kubernetes, or `.env.local` for testing):

```env
# Google Cloud Pub/Sub Configuration
PUBSUB_PROJECT_ID="YOUR_PROJECT_ID"
PUBSUB_TOPIC_NAME="telemetry-events"

# Optional: Enable local stdout fallback logging in addition to Pub/Sub
TELEMETRY_LOG_TO_CONSOLE="false"

# Local authentication (for local testing with Google Cloud SDK)
# GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

> **Note:** If `PUBSUB_PROJECT_ID` or `PUBSUB_TOPIC_NAME` is omitted or unconfigured, the application automatically defaults to local stdout structured logging, ensuring local development and tests operate without errors.

---

## 5. Analytical BigQuery Queries

### 5.1 HTTP Request Latency Analysis (p50, p95, p99)

```sql
SELECT
  JSON_VALUE(data.path) AS endpoint,
  JSON_VALUE(data.method) AS method,
  COUNT(1) AS total_requests,
  ROUND(AVG(LAX_FLOAT64(data.durationMs)), 2) AS avg_duration_ms,                                                           
  ROUND(APPROX_QUANTILES(LAX_FLOAT64(data.durationMs), 100)[SAFE_OFFSET(50)], 2) AS p50_ms,                                 
  ROUND(APPROX_QUANTILES(LAX_FLOAT64(data.durationMs), 100)[SAFE_OFFSET(95)], 2) AS p95_ms,                                 
  ROUND(APPROX_QUANTILES(LAX_FLOAT64(data.durationMs), 100)[SAFE_OFFSET(99)], 2) AS p99_ms   
FROM
  `YOUR_PROJECT_ID.telemetry.app_events`
WHERE
  event_type = 'http.request'
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  endpoint, method
ORDER BY
  total_requests DESC;
```

### 5.2 Server Errors and Exceptions Breakdown

```sql
SELECT
  JSON_VALUE(data.name) AS error_name,
  JSON_VALUE(data.message) AS error_message,
  JSON_VALUE(data.digest) AS next_digest,
  JSON_VALUE(data.context.routePath) AS route_path,
  COUNT(1) AS occurrence_count,
  MIN(timestamp) AS first_seen,
  MAX(timestamp) AS last_seen
FROM
  `YOUR_PROJECT_ID.telemetry.app_events`
WHERE
  event_type = 'server.error'
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
  error_name, error_message, next_digest, route_path
ORDER BY
  occurrence_count DESC;
```

### 5.3 Authentication Audit Trail (Failed vs Successful Logins)

```sql
SELECT
  timestamp,
  JSON_VALUE(data.action) AS action,
  JSON_VALUE(data.status) AS status,
  JSON_VALUE(data.details.email) AS email,
  user_id,
  trace_id
FROM
  `YOUR_PROJECT_ID.telemetry.app_events`
WHERE
  event_type = 'audit.auth'
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY
  timestamp DESC;
```
