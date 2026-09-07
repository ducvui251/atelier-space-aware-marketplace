import type { ServiceName } from "@atelier/contracts";
import { getServiceConfig } from "./index.ts";

/**
 * Shared HTTP client for service-to-service calls (not the Gateway→service
 * path, which has its own client in the web-gateway app). Any service that
 * needs data owned by another service must go through here rather than
 * querying that service's schema directly.
 */
export class InternalServiceError extends Error {
  service: ServiceName;
  status: number;
  correlationId: string;

  // Services run via `node --experimental-strip-types`, which only erases
  // type annotations and does not support TS parameter properties (it can't
  // emit the `this.x = x` assignments those need) — so fields are declared
  // and assigned explicitly here instead.
  constructor(message: string, service: ServiceName, status: number, correlationId: string) {
    super(message);
    this.name = "InternalServiceError";
    this.service = service;
    this.status = status;
    this.correlationId = correlationId;
  }
}

interface RequestOptions extends Omit<RequestInit, "body" | "headers" | "signal"> {
  body?: unknown;
  correlationId?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function requestInternalService<T>(
  service: ServiceName,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const baseUrl = getServiceConfig(service).baseUrl?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new InternalServiceError(`Missing URL for service ${service}`, service, 500, options.correlationId ?? crypto.randomUUID());
  }

  const correlationId = options.correlationId ?? crypto.randomUUID();
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? Number(process.env.SERVICE_REQUEST_TIMEOUT_MS ?? 3000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
      ...options,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        accept: "application/json",
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...(options.headers ?? {}),
        ...(process.env.ATELIER_INTERNAL_SERVICE_TOKEN ? { "x-service-token": process.env.ATELIER_INTERNAL_SERVICE_TOKEN } : {}),
        "x-correlation-id": correlationId,
      },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const errorBody = body as { error?: unknown } | null;
      const message = typeof errorBody?.error === "string" ? errorBody.error : `Service request failed with status ${response.status}`;
      throw new InternalServiceError(message, service, response.status, response.headers.get("x-correlation-id") ?? correlationId);
    }
    return body as T;
  } catch (error) {
    if (error instanceof InternalServiceError) throw error;
    const message = error instanceof Error ? error.message : "Service request failed";
    throw new InternalServiceError(message, service, 503, correlationId);
  } finally {
    clearTimeout(timeout);
  }
}
