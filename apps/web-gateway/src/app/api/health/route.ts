import { GATEWAY_SERVICES } from "@/lib/gateway/services";
import { json } from "@/lib/server/respond";
import { health as accountHealth } from "@atelier/account-service";
import { health as adminHealth } from "@atelier/admin-service";
import { health as artistArtworkHealth } from "@atelier/artist-artwork-service";
import { health as catalogHealth } from "@atelier/catalog-discovery-service";
import { health as commerceHealth } from "@atelier/commerce-service";
import { health as recommendationHealth } from "@atelier/recommendation-service";
import { health as roomPreviewHealth } from "@atelier/room-preview-service";
import { health as verificationHealth } from "@atelier/verification-service";

const downstreamHealth = [accountHealth, catalogHealth, artistArtworkHealth, commerceHealth, recommendationHealth, verificationHealth, roomPreviewHealth, adminHealth];

export function GET() {
  return json({
    service: "web-gateway",
    version: "v1",
    status: "ok",
    timestamp: new Date().toISOString(),
    downstreamServices: GATEWAY_SERVICES.map(({ name, version }, index) => ({ ...downstreamHealth[index](), name, version })),
  });
}
