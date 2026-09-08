import type { ServiceDefinition } from "@atelier/contracts";

// Service definitions duplicated as local constants so the Gateway build
// never depends on service package implementations (ADR 0001 D1). The
// owning service packages remain the source of truth for their metadata;
// if a definition changes there, mirror it here and note it in the PR.
export const GATEWAY_SERVICES = [
  { name: "account", version: "v1", owns: ["users", "roles", "sessions"] },
  { name: "catalog-discovery", version: "v1", owns: ["read-model", "search", "filters", "tags"] },
  { name: "artist-artwork", version: "v1", owns: ["artists", "artworks", "editions", "inventory"] },
  { name: "commerce", version: "v1", owns: ["cart", "checkout", "orders", "payments", "shipments"] },
  { name: "recommendation", version: "v1", owns: ["taste-signals", "ranking", "recommendation-results"] },
  { name: "verification", version: "v1", owns: ["artist-verification", "artwork-verification", "coa", "review-status"] },
  { name: "room-preview", version: "v1", owns: ["room-presets", "placements", "optional-3d-assets"] },
  { name: "admin", version: "v1", owns: ["complaints", "moderation", "audit", "reports"] },
] as const satisfies readonly ServiceDefinition[];
