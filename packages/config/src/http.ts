import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

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

export async function readJson<T = unknown>(request: IncomingMessage): Promise<T | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (chunks.length === 0) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T; } catch { return null; }
}

function getCorrelationId(request: IncomingMessage): string {
  const value = request.headers["x-correlation-id"];
  return (Array.isArray(value) ? value[0] : value)?.trim() || randomUUID();
}

export function createServiceServer(options: ServiceServerOptions): Server {
  assertInternalTokenConfigured(options);

  return createServer(async (request, response) => {
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
        writeServiceError(response, 500, {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Internal service error",
          correlationId,
          retryable: true,
        });
      }
      return;
    }

    writeServiceError(response, 404, { code: "NOT_FOUND", message: "Not Found", correlationId, retryable: false });
  });
}

export function getPort(environmentName: string, fallback: number): number {
  const value = Number(process.env[environmentName] ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
