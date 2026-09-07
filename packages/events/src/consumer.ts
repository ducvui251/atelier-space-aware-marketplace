import { query } from "@atelier/persistence";
import { declareConsumerQueue } from "./broker.ts";

export interface ConsumedEvent {
  id: string;
  type: string;
  version: string;
  occurredAt: string;
  correlationId: string;
  producer: string;
  payload: unknown;
}

export interface ConsumeEventsOptions {
  brokerUrl: string;
  exchange: string;
  /** Durable queue name, e.g. "atelier.catalog-discovery.v1". */
  queue: string;
  routingKeys: string[];
  /** Schema owning this consumer's processed_events dedup table. */
  dedupSchema: string;
  handler: (event: ConsumedEvent) => Promise<void>;
  /** Called once the queue/consumer is set up; useful for readiness checks. */
  onReady?: () => void;
  reconnectDelayMs?: number;
}

/**
 * Starts a durable consumer with at-least-once delivery and event-id
 * dedup (MICROSERVICE_100_PLAN.md section 6.3 step 7). A message that
 * fails processing is nacked without requeue, which — because the queue
 * is declared with x-dead-letter-exchange — routes it to `${queue}.dlq`
 * instead of looping forever against a poison message.
 *
 * Every failure mode — the initial connect, a lost connection, and a
 * failed reconnect attempt — schedules another attempt after
 * `reconnectDelayMs`. A broker that is down or mid-restart (e.g. its
 * container hostname briefly unresolvable) just means repeated retries
 * until it is reachable again; nothing here gives up permanently.
 */
export async function consumeEvents(options: ConsumeEventsOptions): Promise<void> {
  const delay = options.reconnectDelayMs ?? 2000;

  async function connectAndConsume(): Promise<void> {
    let channel: Awaited<ReturnType<typeof declareConsumerQueue>>["channel"];
    let connection: Awaited<ReturnType<typeof declareConsumerQueue>>["connection"];
    try {
      ({ channel, connection } = await declareConsumerQueue(options.brokerUrl, options.exchange, options.queue, options.routingKeys));
    } catch (error) {
      console.error(`[events] consumer failed to connect, retrying in ${delay}ms: queue=${options.queue}`, error instanceof Error ? error.message : error);
      setTimeout(() => { connectAndConsume().catch(() => undefined); }, delay);
      return;
    }

    channel.prefetch(10);
    console.log(`[events] consumer connected: queue=${options.queue}`);

    let reconnectScheduled = false;
    function scheduleReconnect(reason: string) {
      if (reconnectScheduled) return;
      reconnectScheduled = true;
      console.error(`[events] consumer connection lost (${reason}), reconnecting in ${delay}ms: queue=${options.queue}`);
      setTimeout(() => { connectAndConsume().catch(() => undefined); }, delay);
    }
    connection.on("close", () => scheduleReconnect("close"));
    connection.on("error", (error: unknown) => console.error(`[events] connection error: queue=${options.queue}`, error instanceof Error ? error.message : error));

    await channel.consume(options.queue, async (message) => {
      if (!message) return;
      try {
        const event = JSON.parse(message.content.toString("utf8")) as ConsumedEvent;
        const existing = await query<{ event_id: string }>(
          `select event_id from ${options.dedupSchema}.processed_events where event_id = $1::uuid`,
          [event.id],
        );
        if (existing.length === 0) {
          await options.handler(event);
          await query(
            `insert into ${options.dedupSchema}.processed_events (event_id, event_type) values ($1::uuid, $2) on conflict (event_id) do nothing`,
            [event.id, event.type],
          );
        }
        channel.ack(message);
      } catch {
        channel.nack(message, false, false);
      }
    });

    options.onReady?.();
  }

  await connectAndConsume();
}
