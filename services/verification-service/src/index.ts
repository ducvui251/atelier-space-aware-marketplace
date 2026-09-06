import type { ServiceDefinition } from "@atelier/contracts";
export { reviewArtist, reviewArtwork } from "./application/reviews.ts";
export { health } from "./health.ts";

export const VERIFICATION_SERVICE: ServiceDefinition = {
  name: "verification",
  version: "v1",
  owns: ["artist-verification", "artwork-verification", "coa", "review-status"],
};
