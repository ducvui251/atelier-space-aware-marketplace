import { getServiceConfig } from "@atelier/config";
import type { ServiceName } from "@atelier/contracts";

export class ServiceClientError extends Error {
  constructor(
    message: string,
    readonly service: ServiceName,
    readonly status: number,
    readonly correlationId: string,
  ) {
    super(message);
    this.name = "ServiceClientError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body" | "headers" | "signal"> {
  body?: unknown;
  correlationId?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function requestService<T>(service: ServiceName, path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getServiceConfig(service).baseUrl?.replace(/\/$/, "");
  if (!baseUrl) throw new ServiceClientError(`Missing URL for service ${service}`, service, 500, options.correlationId ?? crypto.randomUUID());

  const correlationId = options.correlationId ?? crypto.randomUUID();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 3000);

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
      const message = typeof body?.error === "string" ? body.error : `Service request failed with status ${response.status}`;
      throw new ServiceClientError(message, service, response.status, response.headers.get("x-correlation-id") ?? correlationId);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ServiceClientError) throw error;
    const message = error instanceof Error ? error.message : "Service request failed";
    throw new ServiceClientError(message, service, 503, correlationId);
  } finally {
    clearTimeout(timeout);
  }
}
