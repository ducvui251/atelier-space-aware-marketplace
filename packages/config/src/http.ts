import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { createLogger } from "./logger.ts";

export interface ServiceHealth {
  service: string;
  version: string;
  status: "ok";
  timestamp: string;
}

export type ServiceRouteHandler = (context: {
  request: IncomingMessage;
  response: ServerResponse;
  correlationId: string;
  url: URL;
}) => void | Promise<void>;

export interface ReadinessResult {
  status: "ok" | "unavailable";
  dependencies?: Record<string, "ok" | "unavailable">;
}

interface ServiceServerOptions {
  name: string;
  version: string;
  port?: number;
  health: () => ServiceHealth;
  ready?: () => Promise<ReadinessResult> | ReadinessResult;
  routes?: Record<string, ServiceRouteHandler>;
  internalToken?: string;
}

/**
 * Outside test mode, every service must be started with an internal token.
 * A service silently accepting unauthenticated business calls is worse than
 * one that refuses to start, so this fails closed rather than warning.
 */
function assertInternalTokenConfigured(options: ServiceServerOptions) {
  if (options.internalToken) return;
  if (process.env.NODE_ENV === "test" || process.env.ATELIER_ALLOW_INSECURE_LOCAL === "true") return;
  throw new Error(
    `[${options.name}] ATELIER_INTERNAL_SERVICE_TOKEN is required to start this service outside test mode. ` +
      `Set it in the environment, or set ATELIER_ALLOW_INSECURE_LOCAL=true for an explicit insecure local run.`,
  );
}

export function writeServiceJson(response: ServerResponse, statusCode: number, body: unknown, correlationId: string) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("x-correlation-id", correlationId);
  response.end(JSON.stringify(body));
}

/**
 * Standard error shape (MICROSERVICE_100_PLAN.md section 5.1). `error` is
 * kept as the message field — not renamed to `message` — so every existing
 * Gateway client (`body?.error`) keeps working without a matching update;
 * `code`/`retryable`/`field` are additive.
 */
export interface ServiceErrorParams {
  code: string;
  message: string;
  correlationId: string;
  field?: string;
  retryable?: boolean;
}

export function writeServiceError(response: ServerResponse, statusCode: number, params: ServiceErrorParams) {
  writeServiceJson(response, statusCode, {
    error: params.message,
    code: params.code,
    correlationId: params.correlationId,
    ...(params.field ? { field: params.field } : {}),
    ...(params.retryable !== undefined ? { retryable: params.retryable } : {}),
  }, params.correlationId);
}

const DEFAULT_MAX_BODY_BYTES = 1_000_000; // 1MB — every request body in this API is small JSON; image bytes go through Supabase Storage, not this path.

export class PayloadTooLargeError extends Error {
  constructor(limitBytes: number) {
    super(`Request body exceeds the ${limitBytes} byte limit`);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Body-size bound (MICROSERVICE_100_PLAN.md Phase 2) — without this, a
 * client (malicious or just buggy) can stream an unbounded body and exhaust
 * process memory before JSON.parse ever runs. Aborts the connection as soon
 * as the limit is crossed rather than buffering the whole oversized body
 * first.
 */
export function readJson<T = unknown>(request: IncomingMessage, maxBytes = DEFAULT_MAX_BODY_BYTES): Promise<T | null> {
  // Deliberately NOT `for await...of request`: Node's async-iterator
  // protocol for Readable streams calls `destroy()` on early exit (break,
  // return, or a throw inside the loop) — see Node's stream docs. Since the
  // request and response share one TCP socket, that destroy takes the
  // response down with it, so a thrown PayloadTooLargeError never reaches
  // the client — the connection just hangs. Plain 'data'/'end' listeners
  // don't have that behavior, so pausing here leaves the socket able to
  // carry the 413 response normally.
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    let rejected = false;

    request.on("data", (chunk: Buffer) => {
      if (rejected) return;
      received += chunk.byteLength;
      if (received > maxBytes) {
        rejected = true;
        request.pause();
        reject(new PayloadTooLargeError(maxBytes));
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (rejected) return;
      if (chunks.length === 0) return resolve(null);
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as T); } catch { resolve(null); }
    });

    request.on("error", (error) => {
      if (!rejected) reject(error);
    });
  });
}

function getCorrelationId(request: IncomingMessage): string {
  const value = request.headers["x-correlation-id"];
  return (Array.isArray(value) ? value[0] : value)?.trim() || randomUUID();
}

export function createServiceServer(options: ServiceServerOptions): Server {
  assertInternalTokenConfigured(options);
  const logger = createLogger(options.name);

  const server = createServer(async (request, response) => {
    const correlationId = getCorrelationId(request);
    const url = new URL(request.url ?? "/", "http://service.local");
    const path = url.pathname;

    if (request.method === "GET" && path === "/health") {
      writeServiceJson(response, 200, { ...options.health(), correlationId }, correlationId);
      return;
    }

    if (request.method === "GET" && path === "/ready") {
      const readiness = options.ready ? await options.ready() : { status: "ok" as const };
      writeServiceJson(response, readiness.status === "ok" ? 200 : 503, {
        service: options.name,
        version: options.version,
        status: readiness.status,
        dependencies: readiness.dependencies,
        timestamp: new Date().toISOString(),
        correlationId,
      }, correlationId);
      return;
    }

    if (options.internalToken && request.headers["x-service-token"] !== options.internalToken) {
      writeServiceError(response, 401, { code: "UNAUTHORIZED", message: "Unauthorized", correlationId, retryable: false });
      return;
    }

    const routeKey = `${request.method ?? "GET"} ${path}`;
    const handler = options.routes?.[routeKey] ?? Object.entries(options.routes ?? {}).find(([key]) => {
      const [method, pattern] = key.split(" ", 2);
      const pathParts = path.split("/").filter(Boolean);
      const patternParts = pattern.split("/").filter(Boolean);
      return method === request.method && pathParts.length === patternParts.length && patternParts.every((part, index) => part.startsWith(":") || part === pathParts[index]);
    })?.[1];
    if (handler) {
      try {
        await handler({ request, response, correlationId, url });
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          logger.warn("request rejected: payload too large", { correlationId, path, maxBytes: DEFAULT_MAX_BODY_BYTES });
          writeServiceError(response, 413, { code: "PAYLOAD_TOO_LARGE", message: error.message, correlationId, retryable: false });
          return;
        }
        // The real error (which may carry internal details — SQL text,
        // stack traces, dependency URLs) is logged server-side only; the
        // client gets a generic message ("safe errors", Phase 2).
        logger.error("unhandled route error", { correlationId, path, method: request.method, error });
        writeServiceError(response, 500, {
          code: "INTERNAL_ERROR",
          message: "Internal service error",
          correlationId,
          retryable: true,
        });
      }
      return;
    }

    writeServiceError(response, 404, { code: "NOT_FOUND", message: "Not Found", correlationId, retryable: false });
  });

  server.on("listening", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : address;
    logger.info("service listening", { port });
  });

  return server;
}

export function getPort(environmentName: string, fallback: number): number {
  const value = Number(process.env[environmentName] ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
