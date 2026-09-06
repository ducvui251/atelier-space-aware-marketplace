import { GATEWAY_SERVICES } from "@/lib/gateway/services";
import { requestService } from "@/lib/gateway/http-client";
import { json } from "@/lib/server/respond";

export async function GET() {
  const downstreamServices = await Promise.all(GATEWAY_SERVICES.map(async ({ name, version }) => {
    try {
      const health = await requestService<{ status: "ok"; timestamp: string }>(name, "/health", { timeoutMs: 1000 });
      return { name, version, status: health.status, timestamp: health.timestamp, reachable: true };
    } catch (error) {
      return { name, version, status: "unavailable", reachable: false, error: error instanceof Error ? error.message : "Health check failed" };
    }
  }));
  const status = downstreamServices.every((service) => service.reachable) ? "ok" : "degraded";
  return json({ service: "web-gateway", version: "v1", status, timestamp: new Date().toISOString(), downstreamServices });
}
