import { describe, expect, it } from "vitest";
import {
  AccountSyncRequestSchema,
  AccountUpdateRequestSchema,
  ArtistVerificationReviewRequestSchema,
  ArtworkArtistVerificationRequestSchema,
  ArtworkAvailabilityRequestSchema,
  ArtworkCreateRequestSchema,
  ArtworkSearchQuerySchema,
  ArtworkUpdateRequestSchema,
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
  ToggleFollowRequestSchema,
  ToggleSavedRequestSchema,
  parseBody,
} from "./v1.ts";

const uuid1 = "00000000-0000-4000-8000-000000000001";
const uuid2 = "00000000-0000-4000-8000-000000000002";

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
