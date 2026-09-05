import type { ServiceHealth } from "@atelier/contracts";
export function health(): ServiceHealth { return { service: "artist-artwork", version: "v1", status: "ok", timestamp: new Date().toISOString() }; }
