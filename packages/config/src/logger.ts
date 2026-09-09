/**
 * Structured JSON logger (MICROSERVICE_100_PLAN.md Phase 2, "use the shared
 * logger in every service"). Plain `console.log` scatters unstructured
 * strings that can't be filtered/aggregated by service, level, or
 * correlationId — every line here is a single JSON object instead, so a log
 * pipeline (or a human with jq) can query on any field without parsing
 * prose. Deliberately minimal: no transport config, no log levels beyond
 * the three that exist in this codebase's actual call sites, no dependency.
 */

export type LogLevel = "info" | "warn" | "error";

export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

function serializeFields(fields?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!fields) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = value instanceof Error ? { name: value.name, message: value.message } : value;
  }
  return out;
}

export function createLogger(service: string): Logger {
  function log(level: LogLevel, message: string, fields?: Record<string, unknown>) {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      ...serializeFields(fields),
    });
    if (level === "error") console.error(line);
    else console.log(line);
  }
  return {
    info: (message, fields) => log("info", message, fields),
    warn: (message, fields) => log("warn", message, fields),
    error: (message, fields) => log("error", message, fields),
  };
}
