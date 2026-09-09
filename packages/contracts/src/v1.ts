import { z, type ZodType } from "zod";

// --- Request validation helper -------------------------------------------
// Boundary schemas replace ad hoc `typeof body?.x === "string"` checks in
// every service route handler (MICROSERVICE_100_PLAN.md Phase 3). Route
// handlers call `parseBody(Schema, body)` and, on failure, pass the result
// straight into `writeServiceError` from @atelier/config/http.

export interface ParsedRequestOk<T> { success: true; data: T; }
export interface ParsedRequestError { success: false; code: "VALIDATION_ERROR"; message: string; field?: string; }
export type ParsedRequest<T> = ParsedRequestOk<T> | ParsedRequestError;

export function parseBody<T>(schema: ZodType<T>, body: unknown): ParsedRequest<T> {
  const result = schema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  const issue = result.error.issues[0];
  const field = issue?.path?.length ? issue.path.join(".") : undefined;
  return { success: false, code: "VALIDATION_ERROR", message: issue?.message ?? "Invalid request body", field };
}

// --- Catalog & Discovery: collections (G-17) --------------------------------
// Response contract, not a request schema — GET /v1/catalog/collections
// takes no input. Validated at the route boundary so a shape drift between
// the repository and the documented contract fails loudly instead of
// silently shipping wrong data to the Gateway (MICROSERVICE_100_PLAN.md
// Phase 1, G-17: "executable response contract").

export const CollectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  description: z.string(),
  imageUrl: z.string().trim().min(1),
  artworkCount: z.number().int().nonnegative(),
});

export const CollectionsListResponseSchema = z.object({
  items: z.array(CollectionSchema),
  total: z.number().int().nonnegative(),
});

export const ArtworkSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  style: z.string().trim().optional(),
  color: z.string().trim().optional(),
  orientation: z.string().trim().optional(),
  edition: z.string().trim().optional(),
  availability: z.string().trim().optional(),
  minPrice: z.coerce.number().finite().nonnegative().optional(),
  maxPrice: z.coerce.number().finite().nonnegative().optional(),
});

// The Gateway boundary (what the browser submits) and the internal-service
// boundary (what commerce-service requires) are different contracts: the
// browser never supplies buyerId — it's derived from the caller's validated
// session — while the internal call must carry it explicitly. Keeping one
// schema for both let a stale `buyerId`-less body slip past the Gateway's
// own validation once the internal schema grew a required buyerId field, so
// the client-facing shape is now its own schema and the internal one extends
// it (MICROSERVICE_100_PLAN.md Phase 4 / G-19-adjacent boundary hygiene).
export const CheckoutClientRequestSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().trim().min(1),
    address: z.string().trim().min(1),
    city: z.string().trim().min(1),
    phone: z.string().trim().min(1),
  }),
  method: z.enum(["card", "wallet"]).default("card"),
  simulateFailure: z.boolean().optional(),
});

export const CheckoutRequestSchema = CheckoutClientRequestSchema.extend({
  buyerId: z.string().uuid(),
});

export const CheckoutConfirmRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
});

// --- Account ---------------------------------------------------------------

export const SignupRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(1),
  role: z.enum(["buyer", "artist"]).default("buyer"),
});

export const AccountSyncRequestSchema = z.object({
  authUserId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  // Only honored on first insert (see syncAuthUser) — never lets a repeat
  // sync call change an existing account's role.
  role: z.enum(["buyer", "artist"]).optional(),
});

export const AccountUpdateRequestSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().optional(),
});

// --- Artist & Artwork --------------------------------------------------------

export const EnsureArtistProfileRequestSchema = z.object({
  displayName: z.string().trim().min(1),
});

const orientationEnum = z.enum(["portrait", "landscape", "square"]);
const editionTypeEnum = z.enum(["original", "limited-edition"]);
const availabilityEnum = z.enum(["available", "reserved", "sold"]);
const verificationDecisionEnum = z.enum(["verified", "rejected"]);

export const ArtworkCreateRequestSchema = z.object({
  artistId: z.string().uuid(),
  title: z.string().trim().min(1),
  medium: z.string().trim().min(1),
  imageUrl: z.string().trim().min(1),
  price: z.coerce.number().positive(),
  widthCm: z.coerce.number().positive(),
  heightCm: z.coerce.number().positive(),
  description: z.string().trim().optional(),
  year: z.coerce.number().int().default(() => new Date().getFullYear()),
  currency: z.string().trim().min(1).default("USD"),
  editionType: editionTypeEnum.default("original"),
  orientation: orientationEnum.default("portrait"),
  dominantColors: z.array(z.string()).default([]),
  style: z.array(z.string()).default([]),
});

export const ArtworkUpdateRequestSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  medium: z.string().trim().min(1).optional(),
  price: z.coerce.number().positive().optional(),
  widthCm: z.coerce.number().positive().optional(),
  heightCm: z.coerce.number().positive().optional(),
  year: z.coerce.number().int().optional(),
  currency: z.string().trim().optional(),
  orientation: orientationEnum.optional(),
  dominantColors: z.array(z.string()).optional(),
  style: z.array(z.string()).optional(),
});

export const ArtworkAvailabilityRequestSchema = z.object({
  availability: availabilityEnum,
});

export const CreateReservationRequestSchema = z.object({
  artworkId: z.string().uuid(),
  buyerId: z.string().uuid(),
});

export const ArtworkArtistVerificationRequestSchema = z.object({
  status: verificationDecisionEnum,
  note: z.string().trim().optional(),
  reviewerId: z.string().uuid().optional(),
});

// --- Commerce ----------------------------------------------------------------

export const CartAddRequestSchema = z.object({
  buyerId: z.string().uuid(),
  artworkId: z.string().uuid(),
});

export const ShipOrderRequestSchema = z.object({
  artistId: z.string().uuid(),
  carrier: z.string().trim().min(1),
  trackingNumber: z.string().trim().min(1),
});

export const ConfirmReceivedRequestSchema = z.object({
  buyerId: z.string().uuid(),
});

export const OrderReviewRequestSchema = z.object({
  buyerId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().optional(),
});

// --- Recommendation ------------------------------------------------------------

export const ToggleSavedRequestSchema = z.object({
  buyerId: z.string().uuid(),
  artworkId: z.string().uuid(),
});

export const ToggleFollowRequestSchema = z.object({
  buyerId: z.string().uuid(),
  artistId: z.string().uuid(),
});

// --- Verification --------------------------------------------------------------

export const ArtworkVerificationReviewRequestSchema = z
  .object({
    reviewerAuthUserId: z.string().uuid(),
    status: verificationDecisionEnum,
    note: z.string().trim().optional(),
    coaUrl: z.string().trim().optional(),
  })
  .refine((value) => value.status !== "rejected" || Boolean(value.note?.trim()), {
    message: "note is required when rejecting",
    path: ["note"],
  });

export const ArtistVerificationReviewRequestSchema = z
  .object({
    status: verificationDecisionEnum,
    note: z.string().trim().optional(),
  })
  .refine((value) => value.status !== "rejected" || Boolean(value.note?.trim()), {
    message: "note is required when rejecting",
    path: ["note"],
  });

// --- Room Preview ----------------------------------------------------------------

export const CreateBuyerRoomRequestSchema = z.object({
  buyerId: z.string().uuid(),
  name: z.string().trim().min(1),
  roomType: z.string().trim().min(1),
  wallColor: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
});

export const CreatePlacementRequestSchema = z.object({
  buyerId: z.string().uuid(),
  artworkId: z.string().uuid(),
  scale: z.coerce.number().positive().optional(),
  positionX: z.coerce.number().optional(),
  positionY: z.coerce.number().optional(),
  rotation: z.coerce.number().optional(),
});

// --- Admin -----------------------------------------------------------------------

export const CreateComplaintRequestSchema = z.object({
  reporterId: z.string().uuid(),
  orderId: z.string().uuid(),
  reason: z.string().trim().min(1),
  evidenceUrl: z.string().trim().optional(),
});

export const ResolveComplaintRequestSchema = z.object({
  status: z.enum(["resolved", "rejected"]),
  note: z.string().trim().optional(),
});

// --- Gateway: image upload relay (G-05) --------------------------------
// `POST /api/uploads/image` is a Gateway-only public route (not an internal
// service route, so it isn't in routes.ts) that relays a browser-uploaded
// file into Supabase Storage and returns its public URL. The allow-list and
// size cap are shared constants so the Gateway route and any future client
// pre-check use the exact same rule, and the response is validated against
// this schema before being sent (same "executable response contract"
// pattern as CollectionsListResponseSchema).
export const IMAGE_UPLOAD_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const IMAGE_UPLOAD_MAX_BYTES = 5_000_000; // 5MB — a single artwork photo; not a bulk-media endpoint.

export const ImageUploadResponseSchema = z.object({
  url: z.string().url(),
});

export type ArtworkSearchQuery = z.infer<typeof ArtworkSearchQuerySchema>;
export type ImageUploadResponse = z.infer<typeof ImageUploadResponseSchema>;
export type CheckoutClientRequest = z.infer<typeof CheckoutClientRequestSchema>;
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type CheckoutConfirmRequest = z.infer<typeof CheckoutConfirmRequestSchema>;
export type AccountSyncRequest = z.infer<typeof AccountSyncRequestSchema>;
export type AccountUpdateRequest = z.infer<typeof AccountUpdateRequestSchema>;
export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export type CollectionResponse = z.infer<typeof CollectionSchema>;
export type EnsureArtistProfileRequest = z.infer<typeof EnsureArtistProfileRequestSchema>;
export type ArtworkCreateRequest = z.infer<typeof ArtworkCreateRequestSchema>;
export type ArtworkUpdateRequest = z.infer<typeof ArtworkUpdateRequestSchema>;
export type ArtworkAvailabilityRequest = z.infer<typeof ArtworkAvailabilityRequestSchema>;
export type CreateReservationRequest = z.infer<typeof CreateReservationRequestSchema>;
export type ArtworkArtistVerificationRequest = z.infer<typeof ArtworkArtistVerificationRequestSchema>;
export type CartAddRequest = z.infer<typeof CartAddRequestSchema>;
export type ShipOrderRequest = z.infer<typeof ShipOrderRequestSchema>;
export type ConfirmReceivedRequest = z.infer<typeof ConfirmReceivedRequestSchema>;
export type OrderReviewRequest = z.infer<typeof OrderReviewRequestSchema>;
export type ToggleSavedRequest = z.infer<typeof ToggleSavedRequestSchema>;
export type ToggleFollowRequest = z.infer<typeof ToggleFollowRequestSchema>;
export type ArtworkVerificationReviewRequest = z.infer<typeof ArtworkVerificationReviewRequestSchema>;
export type ArtistVerificationReviewRequest = z.infer<typeof ArtistVerificationReviewRequestSchema>;
export type CreateBuyerRoomRequest = z.infer<typeof CreateBuyerRoomRequestSchema>;
export type CreatePlacementRequest = z.infer<typeof CreatePlacementRequestSchema>;
export type CreateComplaintRequest = z.infer<typeof CreateComplaintRequestSchema>;
export type ResolveComplaintRequest = z.infer<typeof ResolveComplaintRequestSchema>;
