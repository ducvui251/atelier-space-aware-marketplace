import amqp, { type ChannelModel, type ConfirmChannel } from "amqplib";

// One confirm-channel per broker URL, shared by every outbox publisher tick
// in this process. Recreated on connection loss rather than reused stale —
// the plan requires publisher confirms and bounded retries, not just a
// fire-and-forget publish.
const confirmChannels = new Map<string, Promise<ConfirmChannel>>();

export function deadLetterExchangeFor(exchange: string): string {
  return `${exchange}.dlx`;
}

async function connect(url: string): Promise<ChannelModel> {
  return amqp.connect(url);
}

export async function getConfirmChannel(url: string, exchange: string): Promise<ConfirmChannel> {
  const cached = confirmChannels.get(url);
  if (cached) return cached;

  const promise = (async () => {
    const connection = await connect(url);
    const channel = await connection.createConfirmChannel();
    await channel.assertExchange(exchange, "topic", { durable: true });
    connection.on("close", () => confirmChannels.delete(url));
    connection.on("error", () => confirmChannels.delete(url));
    return channel;
  })();

  confirmChannels.set(url, promise);
  promise.catch(() => confirmChannels.delete(url));
  return promise;
}

export async function publishConfirmed(channel: ConfirmChannel, exchange: string, routingKey: string, body: unknown): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(body)), { contentType: "application/json", persistent: true }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

/**
 * Routing keys are stable, kebab-cased projections of the event type so a
 * consumer can bind to `artwork.*` without knowing every exact type string.
 */
export function routingKeyFor(eventType: string): string {
  return eventType.replace(/([a-z0-9])([A-Z])/g, "$1.$2").toLowerCase();
}

export async function declareConsumerQueue(url: string, exchange: string, queue: string, routingKeys: string[]) {
  const connection = await connect(url);
  const channel = await connection.createChannel();
  const dlx = deadLetterExchangeFor(exchange);
  const deadLetterQueue = `${queue}.dlq`;

  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertExchange(dlx, "topic", { durable: true });
  await channel.assertQueue(deadLetterQueue, { durable: true });
  await channel.bindQueue(deadLetterQueue, dlx, "#");
  await channel.assertQueue(queue, { durable: true, arguments: { "x-dead-letter-exchange": dlx } });
  for (const key of routingKeys) await channel.bindQueue(queue, exchange, key);

  return { connection, channel, deadLetterQueue };
}
