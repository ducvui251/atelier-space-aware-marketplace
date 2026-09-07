import type { ServiceHealth } from "@atelier/contracts";
export function health(): ServiceHealth { return { service: "verification", version: "v1", status: "ok", timestamp: new Date().toISOString() }; }
