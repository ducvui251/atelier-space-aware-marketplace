import { Pool, type PoolClient, type QueryResultRow } from "pg";

export type { PoolClient };

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required for durable persistence");
    pool = new Pool({ connectionString, max: Number(process.env.DB_POOL_MAX ?? 10), idleTimeoutMillis: 30_000 });
  }
  return pool;
}

export async function query<T extends QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, values as unknown[]);
  return result.rows;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function isPersistenceConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Lightweight liveness check for /ready endpoints. Bounded so a stalled
 * database connection cannot hang readiness checks indefinitely.
 */
export async function ping(timeoutMs = 1500): Promise<boolean> {
  if (!isPersistenceConfigured()) return false;
  try {
    await Promise.race([
      query("select 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("ping timed out")), timeoutMs)),
    ]);
    return true;
  } catch {
    return false;
  }
}
