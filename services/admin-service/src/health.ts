import type { ServiceHealth } from "@atelier/contracts";
export function health(): ServiceHealth { return { service: "admin", version: "v1", status: "ok", timestamp: new Date().toISOString() }; }
