import type { ServiceHealth } from "@atelier/contracts";

export function health(): ServiceHealth {
  return { service: "room-preview", version: "v1", status: "ok", timestamp: new Date().toISOString() };
}
