import { ACCOUNT_SERVICE } from "@atelier/account-service";
import { ADMIN_SERVICE } from "@atelier/admin-service";
import { ARTIST_ARTWORK_SERVICE } from "@atelier/artist-artwork-service";
import { CATALOG_DISCOVERY_SERVICE } from "@atelier/catalog-discovery-service";
import { COMMERCE_SERVICE } from "@atelier/commerce-service";
import { RECOMMENDATION_SERVICE } from "@atelier/recommendation-service";
import { ROOM_PREVIEW_SERVICE } from "@atelier/room-preview-service";
import { VERIFICATION_SERVICE } from "@atelier/verification-service";

export const GATEWAY_SERVICES = [
  ACCOUNT_SERVICE,
  CATALOG_DISCOVERY_SERVICE,
  ARTIST_ARTWORK_SERVICE,
  COMMERCE_SERVICE,
  RECOMMENDATION_SERVICE,
  VERIFICATION_SERVICE,
  ROOM_PREVIEW_SERVICE,
  ADMIN_SERVICE,
] as const;
