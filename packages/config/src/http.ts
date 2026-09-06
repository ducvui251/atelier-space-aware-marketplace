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

interface ServiceServerOptions {
  name: string;
  version: string;
  port?: number;
  health: () => ServiceHealth;
  routes?: Record<string, ServiceRouteHandler>;
  internalToken?: string;
}

export function writeServiceJson(response: ServerResponse, statusCode: number, body: unknown, correlationId: string) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("x-correlation-id", correlationId);
  response.end(JSON.stringify(body));
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
  return createServer(async (request, response) => {
    const correlationId = getCorrelationId(request);
    const url = new URL(request.url ?? "/", "http://service.local");
    const path = url.pathname;

    if (request.method === "GET" && path === "/health") {
      writeServiceJson(response, 200, { ...options.health(), correlationId }, correlationId);
      return;
    }

    if (request.method === "GET" && path === "/ready") {
      writeServiceJson(response, 200, {
        service: options.name,
        version: options.version,
        status: "ok",
        timestamp: new Date().toISOString(),
        correlationId,
      }, correlationId);
      return;
    }

    if (options.internalToken && request.headers["x-service-token"] !== options.internalToken) {
      writeServiceJson(response, 401, { error: "Unauthorized", correlationId }, correlationId);
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
        writeServiceJson(response, 500, {
          error: error instanceof Error ? error.message : "Internal service error",
          correlationId,
        }, correlationId);
      }
      return;
    }

    writeServiceJson(response, 404, { error: "Not Found", service: options.name, version: options.version, correlationId }, correlationId);
  });
}

export function getPort(environmentName: string, fallback: number): number {
  const value = Number(process.env[environmentName] ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
