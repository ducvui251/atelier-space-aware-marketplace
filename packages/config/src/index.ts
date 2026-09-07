import type { ServiceName } from "@atelier/contracts";

export interface ServiceConfig { name: ServiceName; version: "v1"; port: number; baseUrl?: string; }

export function getServiceConfig(name: ServiceName): ServiceConfig {
  const envKey = `${name.toUpperCase().replaceAll("-", "_")}_SERVICE_URL`;
  const port = Number(process.env[`${name.toUpperCase().replaceAll("-", "_")}_PORT`] ?? 0);
  return { name, version: "v1", port: Number.isFinite(port) ? port : 0, baseUrl: process.env[envKey] };
}

export function getCorrelationId(value?: string | null): string {
  return value?.trim() || crypto.randomUUID();
}

export function createLogger(service: ServiceName) {
  return {
    info(message: string, context: Record<string, unknown> = {}) {
      console.info(JSON.stringify({ level: "info", service, message, ...context }));
    },
    error(message: string, context: Record<string, unknown> = {}) {
      console.error(JSON.stringify({ level: "error", service, message, ...context }));
    },
  };
}
