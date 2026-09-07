import type { ServiceHealth } from "@atelier/contracts";
export function health(): ServiceHealth { return { service: "commerce", version: "v1", status: "ok", timestamp: new Date().toISOString() }; }
