import { describe, expect, it } from "vitest";
import { ArtistVerifiedPayloadSchema, ArtworkVerifiedPayloadSchema, DomainEventTypeSchema, OrderCreatedPayloadSchema, OrderShippedPayloadSchema, PaymentSucceededPayloadSchema } from "./events.ts";

const uuid1 = "00000000-0000-4000-8000-000000000001";
const uuid2 = "00000000-0000-4000-8000-000000000002";

describe("DomainEventTypeSchema", () => {
  it("accepts ArtistVerified (Phase 5, G-22)", () => {
    expect(DomainEventTypeSchema.safeParse("ArtistVerified").success).toBe(true);
  });

  it("rejects an unknown event type", () => {
    expect(DomainEventTypeSchema.safeParse("SomethingElse").success).toBe(false);
  });
});

describe("ArtworkVerifiedPayloadSchema", () => {
  it("accepts a payload without reviewerId (backward compatible)", () => {
    expect(ArtworkVerifiedPayloadSchema.safeParse({ artworkId: uuid1, status: "verified" }).success).toBe(true);
  });

  it("accepts a payload with reviewerId", () => {
    expect(ArtworkVerifiedPayloadSchema.safeParse({ artworkId: uuid1, status: "rejected", reviewerId: uuid2 }).success).toBe(true);
  });

  it("rejects a missing artworkId or invalid status", () => {
    expect(ArtworkVerifiedPayloadSchema.safeParse({ status: "verified" }).success).toBe(false);
    expect(ArtworkVerifiedPayloadSchema.safeParse({ artworkId: uuid1, status: "pending" }).success).toBe(false);
  });
});

describe("ArtistVerifiedPayloadSchema", () => {
  it("accepts a valid payload", () => {
    expect(ArtistVerifiedPayloadSchema.safeParse({ artistId: uuid1, status: "verified", reviewerId: uuid2 }).success).toBe(true);
  });

  it("rejects a missing artistId or invalid status", () => {
    expect(ArtistVerifiedPayloadSchema.safeParse({ status: "verified" }).success).toBe(false);
    expect(ArtistVerifiedPayloadSchema.safeParse({ artistId: uuid1, status: "pending" }).success).toBe(false);
  });
});

describe("OrderCreatedPayloadSchema", () => {
  it("accepts a valid payload", () => {
    expect(OrderCreatedPayloadSchema.safeParse({ orderId: uuid1, buyerId: uuid2, artworkId: uuid1, amount: 100, currency: "USD" }).success).toBe(true);
  });

  it("rejects a missing field", () => {
    expect(OrderCreatedPayloadSchema.safeParse({ orderId: uuid1, buyerId: uuid2, amount: 100, currency: "USD" }).success).toBe(false);
  });
});

describe("PaymentSucceededPayloadSchema", () => {
  it("accepts a valid payload", () => {
    expect(PaymentSucceededPayloadSchema.safeParse({ paymentId: uuid1, orderId: uuid2, buyerId: uuid1, artworkId: uuid2, amount: 100, currency: "USD" }).success).toBe(true);
  });

  it("rejects a missing field", () => {
    expect(PaymentSucceededPayloadSchema.safeParse({ paymentId: uuid1, orderId: uuid2, amount: 100, currency: "USD" }).success).toBe(false);
  });
});

describe("OrderShippedPayloadSchema", () => {
  it("accepts a valid payload", () => {
    expect(OrderShippedPayloadSchema.safeParse({ orderId: uuid1, shipmentId: uuid2, carrier: "GHN", trackingNumber: "GHN123" }).success).toBe(true);
  });

  it("rejects a missing field", () => {
    expect(OrderShippedPayloadSchema.safeParse({ orderId: uuid1, carrier: "GHN", trackingNumber: "GHN123" }).success).toBe(false);
  });
});
