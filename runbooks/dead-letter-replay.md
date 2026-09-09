# Dead-Letter Queue: Inspect & Replay

Every durable event consumer (see `packages/events/src/consumer.ts`) acks a
message on success and nacks it (no requeue) on any handler failure — a
malformed payload, a downstream HTTP error, whatever. Because each consumer
queue is declared with `x-dead-letter-exchange` pointing at
`<exchange>.dlx` ([broker.ts](../packages/events/src/broker.ts)), a nacked
message doesn't loop forever against the same broken message — it's routed
once to `<queue>.dlq` and left there for a human to look at.

Today there's exactly one consumer: `catalog-discovery-service`, queue
`atelier.catalog-discovery.v1`, dead-letter queue
`atelier.catalog-discovery.v1.dlq`. Any new consumer gets its own `<queue>.dlq`
automatically via the same `declareConsumerQueue` helper — no extra wiring
needed.

## Verified 2026-09-07

Published a deliberately malformed message (invalid JSON, so
`JSON.parse` inside the consumer throws) directly to the exchange via the
RabbitMQ management API, and walked the full recover cycle:

1. Message routed to `atelier.catalog-discovery.v1`, consumer's `JSON.parse`
   threw, message nacked -> landed in `atelier.catalog-discovery.v1.dlq`
   (confirmed via `GET /api/queues/%2f/atelier.catalog-discovery.v1.dlq`,
   `messages: 1`).
2. Inspected it via the queue's `get` endpoint — the message carries an
   `x-death` header with the full failure history (`exchange`, `queue`,
   `reason: "rejected"`, `routing-keys`, `time`), which is exactly what you
   need to decide whether it's safe to replay.
3. Replayed it by re-publishing the same payload + routing key to the
   original exchange (`atelier.events.v1`) — it failed the same way and
   landed back in the DLQ, which is the correct outcome for a genuinely
   malformed message (proves the round-trip mechanics; a *transient*
   failure's payload would instead succeed and disappear from the DLQ for
   good).
4. Purged the DLQ to remove the test message and confirmed both queues back
   to `messages: 0`.

## Procedure

All commands use the RabbitMQ management API on `localhost:15672`
(`RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` from `.env`, default
`atelier_events` / `atelier_events_dev_pw` in local dev). Swap in your real
DLQ name (`<queue>.dlq`) throughout.

### 1. Check whether anything is dead-lettered

```bash
curl -s -u atelier_events:atelier_events_dev_pw \
  http://localhost:15672/api/queues/%2f/atelier.catalog-discovery.v1.dlq \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['messages'])"
```

### 2. Inspect messages without removing them

Use `"ackmode":"ack_requeue_true"` to peek — the message goes back onto the
DLQ afterward instead of being consumed:

```bash
curl -s -u atelier_events:atelier_events_dev_pw -X POST \
  http://localhost:15672/api/queues/%2f/atelier.catalog-discovery.v1.dlq/get \
  -H "content-type: application/json" \
  -d '{"count":10,"ackmode":"ack_requeue_true","encoding":"auto"}'
```

Look at `properties.headers.x-death` on each message: `reason` tells you why
it failed (`rejected` = handler threw; `expired`/`maxlen` don't apply here
since we don't set per-message TTL or queue length limits), `queue` tells you
which consumer rejected it, `time` is a Unix timestamp.

### 3. Decide: replay or discard

**Replay** (the failure was transient — e.g. a downstream service was briefly
down, or a bug that's since been fixed) — dequeue with
`"ackmode":"ack_requeue_false"` (removes it from the DLQ) and re-publish the
same `payload` + `routing_key` to the *original* exchange:

```bash
# 1. Dequeue (destructive — copy the "payload" and "routing_key" fields from the response)
curl -s -u atelier_events:atelier_events_dev_pw -X POST \
  http://localhost:15672/api/queues/%2f/atelier.catalog-discovery.v1.dlq/get \
  -H "content-type: application/json" \
  -d '{"count":1,"ackmode":"ack_requeue_false","encoding":"auto"}'

# 2. Re-publish to the original exchange (atelier.events.v1, not the .dlx)
curl -s -u atelier_events:atelier_events_dev_pw -X POST \
  http://localhost:15672/api/exchanges/%2f/atelier.events.v1/publish \
  -H "content-type: application/json" \
  -d '{"properties":{"content_type":"application/json","delivery_mode":2},"routing_key":"<routing_key from step 1>","payload":"<payload from step 1>","payload_encoding":"string"}'
```

The consumer's built-in dedup (`processed_events` table, keyed on the event's
`id`) makes this safe even if the original message was *also* partially
processed before failing — replaying it will not double-apply the effect.

**Discard** (the payload is genuinely malformed and will never succeed, or
the event is no longer relevant) — either dequeue-without-republishing (step
1 above, and stop there), or purge everything at once if the whole DLQ is
junk from a since-fixed bug:

```bash
curl -s -u atelier_events:atelier_events_dev_pw -X DELETE \
  http://localhost:15672/api/queues/%2f/atelier.catalog-discovery.v1.dlq/contents
```

### 4. Root-cause before replaying at volume

A handful of dead-lettered messages is normal (a deploy mid-flight, a
downstream restart). A DLQ that's steadily filling up means something is
systematically broken — check the consuming service's logs
(`docker compose logs -f catalog-discovery-service`) for the actual thrown
error before mass-replaying, or you'll just refill the DLQ.
