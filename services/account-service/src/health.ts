import type { ServiceHealth } from "@atelier/contracts";
export function health(): ServiceHealth { return { service: "account", version: "v1", status: "ok", timestamp: new Date().toISOString() }; }
