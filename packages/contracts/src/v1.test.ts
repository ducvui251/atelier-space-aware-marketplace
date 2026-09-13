import { describe, expect, it } from "vitest";
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
  ArtworkAvailabilityRequestSchema,
  ArtworkCreateRequestSchema,
  ArtworkSearchQuerySchema,
  ArtworkUpdateRequestSchema,
  ArtworkViewRequestSchema,
  RecordArtworkViewResponseSchema,
  PublicDomainArtworkPageQuerySchema,
  PublicDomainArtworkPageResponseSchema,
  PublicDomainArtworkSchema,
  ArtworkVerificationReviewRequestSchema,
  CartAddRequestSchema,
  CheckoutClientRequestSchema,
  CheckoutConfirmRequestSchema,
  CheckoutRequestSchema,
  ConfirmReceivedRequestSchema,
  CreateBuyerRoomRequestSchema,
  CreateComplaintRequestSchema,
  CreatePlacementRequestSchema,
  CreateReservationRequestSchema,
  CollectionSchema,
  CollectionsListResponseSchema,
  ImageUploadResponseSchema,
  OrderReviewRequestSchema,
  ResolveComplaintRequestSchema,
  ShipOrderRequestSchema,
  StripeWebhookRelaySchema,
  ToggleFollowRequestSchema,
  ToggleSavedRequestSchema,
  parseBody,
} from "./v1.ts";

const uuid1 = "00000000-0000-4000-8000-000000000001";
const uuid2 = "00000000-0000-4000-8000-000000000002";

describe("ArtworkViewRequestSchema", () => {
  const validView = {
    artworkId: uuid1,
    viewedOn: "2026-09-12",
    viewerHash: "a".repeat(64),
  };

  it("accepts a valid privacy-preserving view record", () => {
    expect(ArtworkViewRequestSchema.safeParse(validView).success).toBe(true);
  });

  it("rejects malformed viewer hashes and artwork ids", () => {
    expect(ArtworkViewRequestSchema.safeParse({ ...validView, viewerHash: "visitor-id" }).success).toBe(false);
    expect(ArtworkViewRequestSchema.safeParse({ ...validView, artworkId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("ArtistArtworkViewsQuerySchema", () => {
  it("requires a valid, ordered date range", () => {
    expect(ArtistArtworkViewsQuerySchema.safeParse({ artistId: uuid1, from: "2026-09-01", to: "2026-09-12" }).success).toBe(true);
    expect(ArtistArtworkViewsQuerySchema.safeParse({ artistId: uuid1, from: "2026-09-13", to: "2026-09-12" }).success).toBe(false);
  });
});

describe("artwork view response contracts", () => {
  it("validates the idempotent write result and aggregate response", () => {
    expect(RecordArtworkViewResponseSchema.safeParse({ recorded: false }).success).toBe(true);
    expect(ArtistArtworkViewsResponseSchema.safeParse({
      artistId: uuid1,
      from: "2026-09-01",
      to: "2026-09-12",
      items: [{ artworkId: uuid2, views: 4 }],
      totalViews: 4,
    }).success).toBe(true);
  });

  it("rejects negative view counts", () => {
    expect(ArtistArtworkViewsResponseSchema.safeParse({
      artistId: uuid1,
      from: "2026-09-01",
      to: "2026-09-12",
      items: [{ artworkId: uuid2, views: -1 }],
      totalViews: 0,
    }).success).toBe(false);
  });

  it("rejects an aggregate total that does not match its artwork rows", () => {
    expect(ArtistArtworkViewsResponseSchema.safeParse({
      artistId: uuid1,
      from: "2026-09-01",
      to: "2026-09-12",
      items: [{ artworkId: uuid2, views: 4 }],
      totalViews: 5,
    }).success).toBe(false);
  });
});

describe("parseBody", () => {
  it("returns success with parsed data on valid input", () => {
    const result = parseBody(CartAddRequestSchema, { buyerId: uuid1, artworkId: uuid2 });
    expect(result).toEqual({ success: true, data: { buyerId: uuid1, artworkId: uuid2 } });
  });

  it("returns a VALIDATION_ERROR with the offending field on invalid input", () => {
    const result = parseBody(CartAddRequestSchema, { buyerId: uuid1 });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected failure");
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(result.field).toBe("artworkId");
    expect(result.message).toBeTruthy();
  });

  it("handles a completely malformed body (null / non-object) without throwing", () => {
    const result = parseBody(CartAddRequestSchema, null);
    expect(result.success).toBe(false);
  });
});

describe("CollectionsListResponseSchema", () => {
  const validCollection = {
    id: uuid1,
    title: "Warm Minimal",
    description: "Quiet, sunlit works in bone, clay, and sand for calm, spacious rooms.",
    imageUrl: "/img/col-warm.jpg",
    artworkCount: 3,
  };

  it("accepts a well-formed collections list response", () => {
    expect(CollectionsListResponseSchema.safeParse({ items: [validCollection], total: 1 }).success).toBe(true);
  });

  it("accepts an empty collections list", () => {
    expect(CollectionsListResponseSchema.safeParse({ items: [], total: 0 }).success).toBe(true);
  });

  it("rejects a negative artworkCount (a live-read bug, not a valid state)", () => {
    expect(CollectionSchema.safeParse({ ...validCollection, artworkCount: -1 }).success).toBe(false);
  });

  it("rejects a non-uuid id", () => {
    expect(CollectionSchema.safeParse({ ...validCollection, id: "warm-minimal" }).success).toBe(false);
  });
});

describe("ImageUploadResponseSchema", () => {
  it("accepts a well-formed public URL", () => {
    expect(ImageUploadResponseSchema.safeParse({ url: "https://example.supabase.co/storage/v1/object/public/artwork-images/artist-1/abc.jpg" }).success).toBe(true);
  });

  it("rejects a missing or non-url value", () => {
    expect(ImageUploadResponseSchema.safeParse({}).success).toBe(false);
    expect(ImageUploadResponseSchema.safeParse({ url: "not-a-url" }).success).toBe(false);
  });
});

describe("StripeWebhookRelaySchema", () => {
  it("accepts a well-formed relayed event regardless of the object's exact shape", () => {
    expect(StripeWebhookRelaySchema.safeParse({ id: "evt_123", type: "checkout.session.completed", data: { object: { id: "cs_123", payment_status: "paid" } } }).success).toBe(true);
    expect(StripeWebhookRelaySchema.safeParse({ id: "evt_124", type: "payment_intent.payment_failed", data: { object: { id: "pi_123", metadata: { orderIds: "[]" } } } }).success).toBe(true);
  });

  it("rejects a missing id/type or malformed data", () => {
    expect(StripeWebhookRelaySchema.safeParse({ type: "checkout.session.completed", data: { object: {} } }).success).toBe(false);
    expect(StripeWebhookRelaySchema.safeParse({ id: "evt_123", data: { object: {} } }).success).toBe(false);
    expect(StripeWebhookRelaySchema.safeParse({ id: "evt_123", type: "x", data: {} }).success).toBe(false);
  });
});

describe("ArtworkSearchQuerySchema", () => {
  it("accepts an empty query", () => {
    expect(ArtworkSearchQuerySchema.safeParse({}).success).toBe(true);
  });

  it("coerces minPrice/maxPrice from query-string values", () => {
    const result = ArtworkSearchQuerySchema.safeParse({ minPrice: "100", maxPrice: "500" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toMatchObject({ minPrice: 100, maxPrice: 500 });
  });

  it("rejects a negative price", () => {
    expect(ArtworkSearchQuerySchema.safeParse({ minPrice: "-1" }).success).toBe(false);
  });
});

describe("PublicDomainArtworkPageQuerySchema", () => {
  it("defaults to the first page and a bounded page size", () => {
    expect(PublicDomainArtworkPageQuerySchema.parse({})).toEqual({ page: 1, limit: 24 });
    expect(PublicDomainArtworkPageQuerySchema.parse({ page: "3", limit: "12" })).toEqual({ page: 3, limit: 12 });
  });

  it("rejects invalid page and limit values", () => {
    expect(PublicDomainArtworkPageQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(PublicDomainArtworkPageQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
  });
});

describe("PublicDomainArtworkPageResponseSchema", () => {
  it("validates a read-only museum reference page", () => {
    expect(PublicDomainArtworkPageResponseSchema.safeParse({
      items: [{
        id: 42,
        title: "Open artwork",
        artistName: "Artist",
        dateDisplay: "1900",
        mediumDisplay: "Oil on canvas",
        dimensions: "20 × 30 cm",
        imageUrl: "https://openaccess-cdn.clevelandart.org/42/42_web.jpg",
        imageFullUrl: "https://openaccess-cdn.clevelandart.org/42/42_print.jpg",
        imageAltText: "Open artwork",
        sourceUrl: "https://clevelandart.org/art/42",
      }],
      page: 1,
      limit: 24,
      total: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    }).success).toBe(true);
  });

  it("requires a full image URL for the in-page artwork preview", () => {
    expect(PublicDomainArtworkPageResponseSchema.safeParse({
      items: [{
        id: 42,
        title: "Open artwork",
        artistName: "Artist",
        dateDisplay: "1900",
        mediumDisplay: "Oil on canvas",
        dimensions: "20 × 30 cm",
        imageUrl: "https://openaccess-cdn.clevelandart.org/42/42_web.jpg",
        imageAltText: "Artwork",
        sourceUrl: "https://clevelandart.org/art/42",
      }],
      page: 1,
      limit: 24,
      total: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    }).success).toBe(false);
  });
});

describe("PublicDomainArtworkSchema image locations", () => {
  const localArtwork = {
    id: 42,
    title: "Downloaded artwork",
    artistName: "Artist",
    dateDisplay: "1900",
    mediumDisplay: "Oil on canvas",
    dimensions: "20 × 30 cm",
    imageUrl: "/img/cma-open-access/42_web.jpg",
    imageFullUrl: "/img/cma-open-access/42_web.jpg",
    imageAltText: "Downloaded artwork",
    sourceUrl: "https://clevelandart.org/art/42",
  };

  it("accepts locally hosted public assets", () => {
    expect(PublicDomainArtworkSchema.safeParse(localArtwork).success).toBe(true);
  });

  it("rejects protocol-relative and parent-directory image paths", () => {
    expect(PublicDomainArtworkSchema.safeParse({ ...localArtwork, imageUrl: "//images.example/art.jpg" }).success).toBe(false);
    expect(PublicDomainArtworkSchema.safeParse({ ...localArtwork, imageFullUrl: "/img/../secret.jpg" }).success).toBe(false);
  });
});

describe("ArtistEarningsQuerySchema", () => {
  it("defaults period to 'day' on an empty query", () => {
    const result = ArtistEarningsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.period).toBe("day");
  });

  it("accepts week/month and a from/to date range", () => {
    const result = ArtistEarningsQuerySchema.safeParse({ period: "month", from: "2026-01-01", to: "2026-03-01" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toMatchObject({ period: "month", from: "2026-01-01", to: "2026-03-01" });
  });

  it("rejects an invalid period or a non-date from/to", () => {
    expect(ArtistEarningsQuerySchema.safeParse({ period: "year" }).success).toBe(false);
    expect(ArtistEarningsQuerySchema.safeParse({ from: "not-a-date" }).success).toBe(false);
  });
});

describe("ArtistTopArtworksQuerySchema", () => {
  it("defaults limit to 5 on an empty query", () => {
    const result = ArtistTopArtworksQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(5);
  });

  it("rejects a limit above 20", () => {
    expect(ArtistTopArtworksQuerySchema.safeParse({ limit: "21" }).success).toBe(false);
  });
});

describe("ArtistAudienceQuerySchema", () => {
  it("defaults periodDays to 30 on an empty query", () => {
    const result = ArtistAudienceQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.periodDays).toBe(30);
  });

  it("coerces periodDays from a query-string value", () => {
    const result = ArtistAudienceQuerySchema.safeParse({ periodDays: "7" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.periodDays).toBe(7);
  });

  it("rejects a zero, negative, or excessive periodDays", () => {
    expect(ArtistAudienceQuerySchema.safeParse({ periodDays: "0" }).success).toBe(false);
    expect(ArtistAudienceQuerySchema.safeParse({ periodDays: "-5" }).success).toBe(false);
    expect(ArtistAudienceQuerySchema.safeParse({ periodDays: "9999" }).success).toBe(false);
  });
});

describe("CheckoutClientRequestSchema", () => {
  const validAddress = { fullName: "A", address: "1 St", city: "Hanoi", phone: "090" };

  it("accepts a full valid checkout request with no buyerId", () => {
    const result = CheckoutClientRequestSchema.safeParse({ shippingAddress: validAddress, method: "card" });
    expect(result.success).toBe(true);
  });

  it("defaults method to card when omitted", () => {
    const result = CheckoutClientRequestSchema.safeParse({ shippingAddress: validAddress });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.method).toBe("card");
  });

  it("rejects a shipping address missing required fields", () => {
    const result = CheckoutClientRequestSchema.safeParse({ shippingAddress: { fullName: "A" } });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown payment method", () => {
    const result = CheckoutClientRequestSchema.safeParse({ shippingAddress: validAddress, method: "crypto" });
    expect(result.success).toBe(false);
  });
});

describe("CheckoutRequestSchema", () => {
  const validAddress = { fullName: "A", address: "1 St", city: "Hanoi", phone: "090" };

  it("accepts a full valid internal checkout request with a buyerId", () => {
    const result = CheckoutRequestSchema.safeParse({ buyerId: uuid1, shippingAddress: validAddress, method: "card" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing or non-uuid buyerId", () => {
    expect(CheckoutRequestSchema.safeParse({ shippingAddress: validAddress, method: "card" }).success).toBe(false);
    expect(CheckoutRequestSchema.safeParse({ buyerId: "not-a-uuid", shippingAddress: validAddress, method: "card" }).success).toBe(false);
  });
});

describe("CheckoutConfirmRequestSchema", () => {
  it("accepts a non-empty sessionId", () => {
    expect(CheckoutConfirmRequestSchema.safeParse({ sessionId: "cs_test_abc123" }).success).toBe(true);
  });

  it("rejects an empty or missing sessionId", () => {
    expect(CheckoutConfirmRequestSchema.safeParse({ sessionId: "" }).success).toBe(false);
    expect(CheckoutConfirmRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("AccountSyncRequestSchema / AccountUpdateRequestSchema", () => {
  it("requires a valid uuid authUserId and email", () => {
    expect(AccountSyncRequestSchema.safeParse({ authUserId: uuid1, email: "a@b.com" }).success).toBe(true);
    expect(AccountSyncRequestSchema.safeParse({ authUserId: "not-a-uuid", email: "a@b.com" }).success).toBe(false);
    expect(AccountSyncRequestSchema.safeParse({ authUserId: uuid1, email: "not-an-email" }).success).toBe(false);
  });

  it("requires a non-empty fullName for profile updates", () => {
    expect(AccountUpdateRequestSchema.safeParse({ fullName: "Jane" }).success).toBe(true);
    expect(AccountUpdateRequestSchema.safeParse({ fullName: "" }).success).toBe(false);
    expect(AccountUpdateRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("ArtworkCreateRequestSchema", () => {
  const minimal = { artistId: uuid1, title: "Piece", medium: "Oil", imageUrl: "https://x/1.jpg", price: 100, widthCm: 10, heightCm: 10 };

  it("applies defaults for optional fields", () => {
    const result = ArtworkCreateRequestSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USD");
      expect(result.data.editionType).toBe("original");
      expect(result.data.orientation).toBe("portrait");
      expect(result.data.dominantColors).toEqual([]);
      expect(result.data.style).toEqual([]);
      expect(result.data.year).toBe(new Date().getFullYear());
    }
  });

  it("rejects non-positive price/dimensions", () => {
    expect(ArtworkCreateRequestSchema.safeParse({ ...minimal, price: 0 }).success).toBe(false);
    expect(ArtworkCreateRequestSchema.safeParse({ ...minimal, widthCm: -1 }).success).toBe(false);
  });

  it("rejects an invalid editionType/orientation", () => {
    expect(ArtworkCreateRequestSchema.safeParse({ ...minimal, editionType: "unique" }).success).toBe(false);
    expect(ArtworkCreateRequestSchema.safeParse({ ...minimal, orientation: "diagonal" }).success).toBe(false);
  });
});

describe("ArtworkUpdateRequestSchema", () => {
  it("accepts a fully empty patch (no-op update)", () => {
    expect(ArtworkUpdateRequestSchema.safeParse({}).success).toBe(true);
  });

  it("rejects an empty title when provided", () => {
    expect(ArtworkUpdateRequestSchema.safeParse({ title: "" }).success).toBe(false);
  });
});

describe("ArtworkAvailabilityRequestSchema", () => {
  it("only accepts the three known availability values", () => {
    for (const value of ["available", "reserved", "sold"]) {
      expect(ArtworkAvailabilityRequestSchema.safeParse({ availability: value }).success).toBe(true);
    }
    expect(ArtworkAvailabilityRequestSchema.safeParse({ availability: "hidden" }).success).toBe(false);
  });
});

describe("ArtworkArtistVerificationRequestSchema", () => {
  it("accepts verified/rejected with an optional reviewerId", () => {
    expect(ArtworkArtistVerificationRequestSchema.safeParse({ status: "verified" }).success).toBe(true);
    expect(ArtworkArtistVerificationRequestSchema.safeParse({ status: "rejected", reviewerId: uuid1 }).success).toBe(true);
  });
});

describe("ShipOrderRequestSchema / ConfirmReceivedRequestSchema / OrderReviewRequestSchema", () => {
  it("requires artistId, carrier, and trackingNumber to ship", () => {
    expect(ShipOrderRequestSchema.safeParse({ artistId: uuid1, carrier: "DHL", trackingNumber: "T1" }).success).toBe(true);
    expect(ShipOrderRequestSchema.safeParse({ artistId: uuid1, carrier: "", trackingNumber: "T1" }).success).toBe(false);
  });

  it("requires a valid buyerId to confirm receipt", () => {
    expect(ConfirmReceivedRequestSchema.safeParse({ buyerId: uuid1 }).success).toBe(true);
    expect(ConfirmReceivedRequestSchema.safeParse({}).success).toBe(false);
  });

  it("bounds rating to 1-5 and coerces numeric strings", () => {
    expect(OrderReviewRequestSchema.safeParse({ buyerId: uuid1, rating: "5" }).success).toBe(true);
    expect(OrderReviewRequestSchema.safeParse({ buyerId: uuid1, rating: 0 }).success).toBe(false);
    expect(OrderReviewRequestSchema.safeParse({ buyerId: uuid1, rating: 6 }).success).toBe(false);
  });
});

describe("ToggleSavedRequestSchema / ToggleFollowRequestSchema", () => {
  it("requires both ids as valid uuids", () => {
    expect(ToggleSavedRequestSchema.safeParse({ buyerId: uuid1, artworkId: uuid2 }).success).toBe(true);
    expect(ToggleFollowRequestSchema.safeParse({ buyerId: uuid1, artistId: "x" }).success).toBe(false);
  });
});

describe("ArtworkVerificationReviewRequestSchema / ArtistVerificationReviewRequestSchema", () => {
  it("allows verifying without a note", () => {
    expect(ArtworkVerificationReviewRequestSchema.safeParse({ reviewerAuthUserId: uuid1, status: "verified" }).success).toBe(true);
    expect(ArtistVerificationReviewRequestSchema.safeParse({ status: "verified" }).success).toBe(true);
  });

  it("requires a non-empty note when rejecting", () => {
    const artworkResult = ArtworkVerificationReviewRequestSchema.safeParse({ reviewerAuthUserId: uuid1, status: "rejected" });
    expect(artworkResult.success).toBe(false);
    if (!artworkResult.success) expect(artworkResult.error.issues[0]?.path).toEqual(["note"]);

    const artistResult = ArtistVerificationReviewRequestSchema.safeParse({ status: "rejected", note: "  " });
    expect(artistResult.success).toBe(false);
  });

  it("accepts rejection once a note is supplied", () => {
    expect(ArtworkVerificationReviewRequestSchema.safeParse({ reviewerAuthUserId: uuid1, status: "rejected", note: "Not signed" }).success).toBe(true);
  });
});

describe("CreateReservationRequestSchema", () => {
  it("requires both artworkId and buyerId as valid uuids", () => {
    expect(CreateReservationRequestSchema.safeParse({ artworkId: uuid1, buyerId: uuid2 }).success).toBe(true);
    expect(CreateReservationRequestSchema.safeParse({ artworkId: uuid1 }).success).toBe(false);
    expect(CreateReservationRequestSchema.safeParse({ artworkId: "x", buyerId: uuid2 }).success).toBe(false);
  });
});

describe("CreateBuyerRoomRequestSchema / CreatePlacementRequestSchema", () => {
  it("requires name and roomType to create a room", () => {
    expect(CreateBuyerRoomRequestSchema.safeParse({ buyerId: uuid1, name: "Living", roomType: "living" }).success).toBe(true);
    expect(CreateBuyerRoomRequestSchema.safeParse({ buyerId: uuid1, name: "", roomType: "living" }).success).toBe(false);
  });

  it("allows omitting placement transform fields", () => {
    expect(CreatePlacementRequestSchema.safeParse({ buyerId: uuid1, artworkId: uuid2 }).success).toBe(true);
  });
});

describe("CreateComplaintRequestSchema / ResolveComplaintRequestSchema", () => {
  it("requires a non-empty reason", () => {
    expect(CreateComplaintRequestSchema.safeParse({ reporterId: uuid1, orderId: uuid2, reason: "Late" }).success).toBe(true);
    expect(CreateComplaintRequestSchema.safeParse({ reporterId: uuid1, orderId: uuid2, reason: "" }).success).toBe(false);
  });

  it("only accepts resolved/rejected as a resolution status", () => {
    expect(ResolveComplaintRequestSchema.safeParse({ status: "resolved" }).success).toBe(true);
    expect(ResolveComplaintRequestSchema.safeParse({ status: "open" }).success).toBe(false);
  });
});
