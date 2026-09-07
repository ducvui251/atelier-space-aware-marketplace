import { transaction, type PoolClient } from "@atelier/persistence";
import { getConfirmChannel, publishConfirmed, routingKeyFor } from "./broker.ts";

export interface OutboxEventInput {
  type: string;
  aggregateId: string;
  correlationId: string;
  payload: unknown;
}

/**
 * Inserts one outbox row within the caller's own transaction, so the event
 * only becomes visible to the publisher if the owning mutation commits
 * (MICROSERVICE_100_PLAN.md section 6.3, step 1-2). `schema` is always a
 * hardcoded call-site literal (never external input), so string-building
 * the table name here does not admit SQL injection.
 */
export async function writeOutboxEvent(client: PoolClient, schema: string, input: OutboxEventInput): Promise<void> {
  await client.query(
    `insert into ${schema}.event_outbox (event_type, aggregate_id, correlation_id, payload)
     values ($1, $2::uuid, $3::uuid, $4::jsonb)`,
    [input.type, input.aggregateId, input.correlationId, JSON.stringify(input.payload)],
  );
}

interface OutboxRow {
  id: string;
  event_type: string;
  event_version: string;
  correlation_id: string;
  payload: unknown;
}

export interface OutboxPublisherOptions {
  /** Schema owning the event_outbox table (must match the caller's own schema). */
  schema: string;
  brokerUrl: string;
  exchange: string;
  /** Value written into the event envelope's `producer` field. */
  producer: string;
  pollIntervalMs?: number;
  maxAttempts?: number;
  batchSize?: number;
}

async function publishPendingBatch(options: OutboxPublisherOptions): Promise<number> {
  return transaction(async (client) => {
    const rows = await client.query<OutboxRow>(
      `select id, event_type, event_version, correlation_id, payload
       from ${options.schema}.event_outbox
       where published_at is null and attempts < $1
       order by created_at
       limit $2
       for update skip locked`,
      [options.maxAttempts ?? 10, options.batchSize ?? 20],
    );
    if (rows.rows.length === 0) return 0;

    const channel = await getConfirmChannel(options.brokerUrl, options.exchange);
    for (const row of rows.rows) {
      const event = {
        id: row.id,
        type: row.event_type,
        version: row.event_version,
        occurredAt: new Date().toISOString(),
        correlationId: row.correlation_id,
        producer: options.producer,
        payload: row.payload,
      };
      try {
        await publishConfirmed(channel, options.exchange, routingKeyFor(row.event_type), event);
        await client.query(`update ${options.schema}.event_outbox set published_at = now() where id = $1`, [row.id]);
      } catch (error) {
        await client.query(
          `update ${options.schema}.event_outbox set attempts = attempts + 1, last_error = $2 where id = $1`,
          [row.id, error instanceof Error ? error.message : String(error)],
        );
      }
    }
    return rows.rows.length;
  });
}

/**
 * Runs the outbox publish loop in-process (same pattern as the Catalog
 * read-model's poll loop in services/catalog-discovery-service/src/server.ts).
 * A broker outage just means ticks fail and retry — pending rows stay
 * unpublished with published_at null, so nothing is lost, and normal
 * publishing resumes automatically once the broker is reachable again.
 */
export function runOutboxPublisher(options: OutboxPublisherOptions): { stop: () => void } {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function tick() {
    if (stopped) return;
    try {
      await publishPendingBatch(options);
    } catch {
      // Broker/DB unreachable this tick — pending rows remain unpublished
      // and are retried on the next tick; nothing to clean up here.
    } finally {
      if (!stopped) timer = setTimeout(tick, options.pollIntervalMs ?? 1000);
    }
  }

  tick();
  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
