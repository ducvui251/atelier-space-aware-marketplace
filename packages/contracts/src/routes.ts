import type { ZodType } from "zod";
import {
  AccountSyncRequestSchema,
  AccountUpdateRequestSchema,
  ArtistArtworkViewsQuerySchema,
  ArtistArtworkViewsResponseSchema,
  ArtistAudienceQuerySchema,
  ArtistEarningsQuerySchema,
  ArtistTopArtworksQuerySchema,
  ArtistVerificationReviewRequestSchema,
  ArtworkArtistVerificationRequestSchema,
  ArtworkViewRequestSchema,
  RecordArtworkViewResponseSchema,
  ArtworkAvailabilityRequestSchema,
  ArtworkCreateRequestSchema,
  ArtworkSearchQuerySchema,
  ArtworkUpdateRequestSchema,
  ArtworkVerificationReviewRequestSchema,
  PublicDomainArtworkPageQuerySchema,
  PublicDomainArtworkPageResponseSchema,
  CartAddRequestSchema,
  CheckoutConfirmRequestSchema,
  CheckoutRequestSchema,
  ConfirmReceivedRequestSchema,
  CreateBuyerRoomRequestSchema,
  CreateComplaintRequestSchema,
  CreatePlacementRequestSchema,
  CreateReservationRequestSchema,
  EnsureArtistProfileRequestSchema,
  OrderReviewRequestSchema,
  ResolveComplaintRequestSchema,
  ShipOrderRequestSchema,
  StripeWebhookRelaySchema,
  ToggleFollowRequestSchema,
  ToggleSavedRequestSchema,
} from "./v1.ts";
import type { ServiceName } from "./index.ts";

/**
 * The single source of truth for "every listed internal route"
 * (MICROSERVICE_100_PLAN.md Phase 3). `openapi:generate` reads this table
 * to emit openapi.json — the doc is only ever as stale as this file, which
 * is also what route handlers should be checked against in review.
 */
export interface RouteDefinition {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  service: ServiceName;
  summary: string;
  auth: "public" | "internal";
  requestSchema?: ZodType;
  requestLocation?: "body" | "query";
  responseSchema?: ZodType;
  successStatus: number;
  errorStatuses: number[];
}

export const ROUTES: RouteDefinition[] = [
  // account
  { method: "GET", path: "/v1/account/me", service: "account", summary: "Get the caller's account profile (identity from a signed x-principal header, G-19)", auth: "internal", successStatus: 200, errorStatuses: [401, 404] },
  { method: "POST", path: "/v1/account/users/sync", service: "account", summary: "Idempotently sync a Supabase identity to an account profile", auth: "internal", requestSchema: AccountSyncRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401] },
  { method: "PATCH", path: "/v1/account/me", service: "account", summary: "Update the caller's own profile (identity from a signed x-principal header, G-19)", auth: "internal", requestSchema: AccountUpdateRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 404] },

  // catalog-discovery
  { method: "GET", path: "/v1/catalog/artworks", service: "catalog-discovery", summary: "Search the catalog read model", auth: "internal", requestSchema: ArtworkSearchQuerySchema, requestLocation: "query", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/catalog/reference-artworks", service: "catalog-discovery", summary: "Page through the locally imported Cleveland Museum of Art CC0 reference collection", auth: "internal", requestSchema: PublicDomainArtworkPageQuerySchema, requestLocation: "query", responseSchema: PublicDomainArtworkPageResponseSchema, successStatus: 200, errorStatuses: [400, 401, 500] },
  { method: "GET", path: "/v1/catalog/collections", service: "catalog-discovery", summary: "List curated collections with live artwork counts", auth: "internal", successStatus: 200, errorStatuses: [401, 500] },

  // artist-artwork
  { method: "GET", path: "/v1/artist-artwork/artworks", service: "artist-artwork", summary: "List canonical artworks", auth: "internal", successStatus: 200, errorStatuses: [401] },
  { method: "GET", path: "/v1/artist-artwork/artist/artworks", service: "artist-artwork", summary: "List one artist's artworks", auth: "internal", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/artist-artwork/artworks/{id}", service: "artist-artwork", summary: "Get canonical artwork detail", auth: "internal", successStatus: 200, errorStatuses: [401, 404] },
  { method: "GET", path: "/v1/artist-artwork/artists", service: "artist-artwork", summary: "List artist profiles", auth: "internal", successStatus: 200, errorStatuses: [401] },
  { method: "GET", path: "/v1/artist-artwork/artists/by-user/{userId}", service: "artist-artwork", summary: "Look up the artist profile owned by an Account user", auth: "internal", successStatus: 200, errorStatuses: [401, 404] },
  { method: "POST", path: "/v1/artist-artwork/artists/by-user/{userId}", service: "artist-artwork", summary: "Idempotently provision the artist profile for an Account user (G-06 signup)", auth: "internal", requestSchema: EnsureArtistProfileRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/artist-artwork/artists/{id}", service: "artist-artwork", summary: "Get artist profile detail", auth: "internal", successStatus: 200, errorStatuses: [401, 404] },
  { method: "PATCH", path: "/v1/artist-artwork/artworks/{id}/verification", service: "artist-artwork", summary: "Apply a verification decision to an artwork's projection", auth: "internal", requestSchema: ArtworkArtistVerificationRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 404] },
  { method: "PATCH", path: "/v1/artist-artwork/artists/{id}/verification", service: "artist-artwork", summary: "Apply a verification decision to an artist's projection", auth: "internal", requestSchema: ArtworkArtistVerificationRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 404] },
  { method: "PATCH", path: "/v1/artist-artwork/artworks/{id}/availability", service: "artist-artwork", summary: "Transition an artwork's availability", auth: "internal", requestSchema: ArtworkAvailabilityRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 409] },
  { method: "POST", path: "/v1/artist-artwork/artworks", service: "artist-artwork", summary: "Create an artist-owned artwork listing", auth: "internal", requestSchema: ArtworkCreateRequestSchema, requestLocation: "body", successStatus: 201, errorStatuses: [400, 401] },
  { method: "PATCH", path: "/v1/artist-artwork/artworks/{id}", service: "artist-artwork", summary: "Update artwork metadata (resets verification to pending)", auth: "internal", requestSchema: ArtworkUpdateRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 404] },
  { method: "POST", path: "/v1/artist-artwork/reservations", service: "artist-artwork", summary: "Atomically reserve an available artwork ahead of checkout", auth: "internal", requestSchema: CreateReservationRequestSchema, requestLocation: "body", successStatus: 201, errorStatuses: [400, 401, 409] },
  { method: "POST", path: "/v1/artist-artwork/reservations/{id}/commit", service: "artist-artwork", summary: "Commit a held reservation to sold (only if unexpired)", auth: "internal", successStatus: 200, errorStatuses: [401, 409] },
  { method: "POST", path: "/v1/artist-artwork/reservations/{id}/release", service: "artist-artwork", summary: "Release a held reservation back to available (idempotent)", auth: "internal", successStatus: 200, errorStatuses: [401] },

  // commerce
  { method: "GET", path: "/v1/commerce/cart", service: "commerce", summary: "Get the buyer's cart", auth: "internal", successStatus: 200, errorStatuses: [400, 401] },
  { method: "POST", path: "/v1/commerce/cart", service: "commerce", summary: "Add an artwork to the buyer's cart", auth: "internal", requestSchema: CartAddRequestSchema, requestLocation: "body", successStatus: 201, errorStatuses: [400, 401] },
  { method: "DELETE", path: "/v1/commerce/cart/{artworkId}", service: "commerce", summary: "Remove an artwork from the buyer's cart", auth: "internal", successStatus: 200, errorStatuses: [400, 401] },
  { method: "POST", path: "/v1/commerce/checkout", service: "commerce", summary: "Checkout the buyer's cart (fixed-price, idempotent)", auth: "internal", requestSchema: CheckoutRequestSchema, requestLocation: "body", successStatus: 201, errorStatuses: [400, 401, 409] },
  { method: "POST", path: "/v1/commerce/checkout/confirm", service: "commerce", summary: "Confirm a Stripe Checkout Session and finalize the order (idempotent)", auth: "internal", requestSchema: CheckoutConfirmRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 404, 409] },
  { method: "POST", path: "/v1/commerce/payments/webhook", service: "commerce", summary: "Receive a Gateway-relayed, already signature-verified Stripe webhook event (idempotent by provider event ID, G-04)", auth: "internal", requestSchema: StripeWebhookRelaySchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/commerce/stats", service: "commerce", summary: "Aggregate order/revenue stats", auth: "internal", successStatus: 200, errorStatuses: [401] },
  { method: "GET", path: "/v1/commerce/orders", service: "commerce", summary: "List the buyer's own orders", auth: "internal", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/commerce/artist-orders", service: "commerce", summary: "List orders for an artist's artworks", auth: "internal", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/commerce/artist-earnings", service: "commerce", summary: "Per-artist earnings aggregate: received/pending-payment/refunded totals, order status counts, revenue trend (§4.7)", auth: "internal", requestSchema: ArtistEarningsQuerySchema, requestLocation: "query", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/commerce/artist-top-artworks", service: "commerce", summary: "Top-selling artwork for an artist, gated on completed orders (§4.7)", auth: "internal", requestSchema: ArtistTopArtworksQuerySchema, requestLocation: "query", successStatus: 200, errorStatuses: [400, 401] },
  { method: "POST", path: "/v1/commerce/orders/{id}/ship", service: "commerce", summary: "Mark an order shipped (artist-owned)", auth: "internal", requestSchema: ShipOrderRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 403] },
  { method: "POST", path: "/v1/commerce/orders/{id}/confirm-received", service: "commerce", summary: "Buyer confirms receipt of a shipped order", auth: "internal", requestSchema: ConfirmReceivedRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 409] },
  { method: "POST", path: "/v1/commerce/orders/{id}/reviews", service: "commerce", summary: "Leave a review on a completed order", auth: "internal", requestSchema: OrderReviewRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 409] },

  // recommendation
  { method: "GET", path: "/v1/recommendation/recommendations", service: "recommendation", summary: "Get ranked recommendations (personalized or curated)", auth: "internal", successStatus: 200, errorStatuses: [401] },
  { method: "GET", path: "/v1/recommendation/saved", service: "recommendation", summary: "List the buyer's saved artworks", auth: "internal", successStatus: 200, errorStatuses: [400, 401] },
  { method: "POST", path: "/v1/recommendation/saved", service: "recommendation", summary: "Toggle save/unsave for an artwork", auth: "internal", requestSchema: ToggleSavedRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/recommendation/follows", service: "recommendation", summary: "List the artists the buyer follows", auth: "internal", successStatus: 200, errorStatuses: [400, 401] },
  { method: "POST", path: "/v1/recommendation/follows", service: "recommendation", summary: "Toggle follow/unfollow for an artist", auth: "internal", requestSchema: ToggleFollowRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/recommendation/artist-audience", service: "recommendation", summary: "Follower count and growth vs a previous period (§4.7)", auth: "internal", requestSchema: ArtistAudienceQuerySchema, requestLocation: "query", successStatus: 200, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/recommendation/artist-saves", service: "recommendation", summary: "Per-artwork save counts for an artist's own artworks (§4.7)", auth: "internal", successStatus: 200, errorStatuses: [400, 401] },
  { method: "POST", path: "/v1/recommendation/artwork-views", service: "recommendation", summary: "Idempotently record one privacy-preserving artwork detail view per viewer and UTC day", auth: "internal", requestSchema: ArtworkViewRequestSchema, requestLocation: "body", responseSchema: RecordArtworkViewResponseSchema, successStatus: 200, errorStatuses: [400, 401, 500] },
  { method: "GET", path: "/v1/recommendation/artist-views", service: "recommendation", summary: "Per-artwork unique daily view counts for an artist and date range", auth: "internal", requestSchema: ArtistArtworkViewsQuerySchema, requestLocation: "query", responseSchema: ArtistArtworkViewsResponseSchema, successStatus: 200, errorStatuses: [400, 401, 500, 503] },

  // verification
  { method: "POST", path: "/v1/verification/artworks/{id}/review", service: "verification", summary: "Record a verification decision for an artwork", auth: "internal", requestSchema: ArtworkVerificationReviewRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 404] },
  { method: "POST", path: "/v1/verification/artists/{id}/review", service: "verification", summary: "Record a verification decision for an artist", auth: "internal", requestSchema: ArtistVerificationReviewRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 404] },

  // room-preview
  { method: "GET", path: "/v1/room-preview/rooms", service: "room-preview", summary: "List static presets, or the buyer's saved rooms if buyerId is given", auth: "internal", successStatus: 200, errorStatuses: [401] },
  { method: "POST", path: "/v1/room-preview/rooms", service: "room-preview", summary: "Persist a buyer-owned room", auth: "internal", requestSchema: CreateBuyerRoomRequestSchema, requestLocation: "body", successStatus: 201, errorStatuses: [400, 401] },
  { method: "GET", path: "/v1/room-preview/rooms/{id}/placements", service: "room-preview", summary: "List placements in a room", auth: "internal", successStatus: 200, errorStatuses: [401] },
  { method: "POST", path: "/v1/room-preview/rooms/{id}/placements", service: "room-preview", summary: "Persist an artwork placement in a room", auth: "internal", requestSchema: CreatePlacementRequestSchema, requestLocation: "body", successStatus: 201, errorStatuses: [400, 401, 404] },
  { method: "DELETE", path: "/v1/room-preview/rooms/{id}/placements/{placementId}", service: "room-preview", summary: "Remove a placement (buyer-owned only)", auth: "internal", successStatus: 200, errorStatuses: [400, 401, 404] },

  // admin
  { method: "GET", path: "/v1/admin/verification-queue", service: "admin", summary: "List artists/artworks pending verification", auth: "internal", successStatus: 200, errorStatuses: [401] },
  { method: "GET", path: "/v1/admin/stats", service: "admin", summary: "Aggregate operational stats across services", auth: "internal", successStatus: 200, errorStatuses: [401] },
  { method: "GET", path: "/v1/admin/complaints", service: "admin", summary: "List complaints", auth: "internal", successStatus: 200, errorStatuses: [401] },
  { method: "POST", path: "/v1/admin/complaints", service: "admin", summary: "File a complaint against an order", auth: "internal", requestSchema: CreateComplaintRequestSchema, requestLocation: "body", successStatus: 201, errorStatuses: [400, 401] },
  { method: "POST", path: "/v1/admin/complaints/{id}/resolve", service: "admin", summary: "Resolve or reject a complaint", auth: "internal", requestSchema: ResolveComplaintRequestSchema, requestLocation: "body", successStatus: 200, errorStatuses: [400, 401, 404] },
];
