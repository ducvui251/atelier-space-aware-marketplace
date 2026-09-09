import { z } from "zod";
import { CorrelationIdSchema } from "./transport.ts";

export const DomainEventTypeSchema = z.enum([
  "ArtworkPublished",
  "ArtworkVerified",
  "ArtistVerified",
  "ArtworkReserved",
  "ArtworkSold",
  "ArtworkSaved",
  "ArtistFollowed",
  "OrderCreated",
  "PaymentSucceeded",
  "OrderShipped",
  "ComplaintOpened",
]);

export const DomainEventSchema = z.object({
  id: z.string().uuid(),
  type: DomainEventTypeSchema,
  version: z.literal("v1"),
  occurredAt: z.string().datetime(),
  correlationId: CorrelationIdSchema,
  producer: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export type DomainEvent = z.infer<typeof DomainEventSchema>;

// --- Implemented event payloads --------------------------------------------
// Artist & Artwork is the producer for all three; Catalog & Discovery is the
// only consumer implemented so far (MICROSERVICE_100_PLAN.md Phase 4 — one
// complete, tested path rather than every event in the catalog table).

export const ArtworkPublishedPayloadSchema = z.object({
  artworkId: z.string().uuid(),
  artistId: z.string().uuid(),
});

export const ArtworkVerifiedPayloadSchema = z.object({
  artworkId: z.string().uuid(),
  status: z.enum(["verified", "rejected"]),
  reviewerId: z.string().uuid().optional(),
});

// Verification's own outbox event (Phase 5, G-22) — Artist & Artwork
// consumes this to update its projection instead of being PATCHed
// synchronously. It deliberately does NOT re-publish under this same type
// afterward (that caused a self-consumption loop — see catalog-repository.ts
// and server.ts's `emitEvent` option); Catalog gets the update by directly
// consuming this same event on the shared routing key instead.
export const ArtistVerifiedPayloadSchema = z.object({
  artistId: z.string().uuid(),
  status: z.enum(["verified", "rejected"]),
  reviewerId: z.string().uuid().optional(),
});

export const ArtworkSoldPayloadSchema = z.object({
  artworkId: z.string().uuid(),
});

export const ArtworkReservedPayloadSchema = z.object({
  artworkId: z.string().uuid(),
  reservationId: z.string().uuid(),
  expiresAt: z.string(),
});

// Commerce's outbox events (Phase 5) — Admin consumes both to populate
// admin.order_feed. Each payload carries enough fields (buyerId, artworkId,
// amount, currency) to upsert a complete row on its own, so the read model
// self-heals correctly regardless of which of the two events a consumer
// processes first (see admin-repository.ts).
export const OrderCreatedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  buyerId: z.string().uuid(),
  artworkId: z.string().uuid(),
  amount: z.number(),
  currency: z.string(),
});

export const PaymentSucceededPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  orderId: z.string().uuid(),
  buyerId: z.string().uuid(),
  artworkId: z.string().uuid(),
  amount: z.number(),
  currency: z.string(),
});

// Also Commerce (from shipOrder) -> Admin (marks admin.order_feed shipped).
export const OrderShippedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  shipmentId: z.string().uuid(),
  carrier: z.string(),
  trackingNumber: z.string(),
});

export type ArtworkPublishedPayload = z.infer<typeof ArtworkPublishedPayloadSchema>;
export type ArtworkVerifiedPayload = z.infer<typeof ArtworkVerifiedPayloadSchema>;
export type ArtistVerifiedPayload = z.infer<typeof ArtistVerifiedPayloadSchema>;
export type ArtworkSoldPayload = z.infer<typeof ArtworkSoldPayloadSchema>;
export type ArtworkReservedPayload = z.infer<typeof ArtworkReservedPayloadSchema>;
export type OrderCreatedPayload = z.infer<typeof OrderCreatedPayloadSchema>;
export type PaymentSucceededPayload = z.infer<typeof PaymentSucceededPayloadSchema>;
export type OrderShippedPayload = z.infer<typeof OrderShippedPayloadSchema>;
