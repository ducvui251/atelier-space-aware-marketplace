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
  // Both left optional (no default): a caller that omits them gets the full
  // matched list, same as before pagination existed — e.g. the /artworks
  // page's unfiltered fetch that backs its filter dropdown option lists
  // needs every artwork, not one page of them.
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
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
    // The buyer-side location identifiers calculated shipping needs (see
    // shippingMethodEnum) -- paired with the artist's originPostalCode /
    // originCountry. country is ISO 3166-1 alpha-2 (e.g. "US", "VN") --
    // required for a real carrier-rate API call (Shippo), not just the
    // placeholder formula.
    postalCode: z.string().trim().min(1),
    country: z.string().trim().length(2, "Use a 2-letter country code, e.g. US").toUpperCase(),
    // Optional (most countries don't use one), but confirmed live that
    // Shippo refuses to purchase a real US label without it -- see
    // originState above.
    state: z.string().trim().optional(),
  }),
  method: z.enum(["card", "wallet"]).default("card"),
});

export const CheckoutRequestSchema = CheckoutClientRequestSchema.extend({
  buyerId: z.string().uuid(),
});

export const CheckoutConfirmRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
});

export const CheckoutCancelRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
  buyerId: z.string().uuid(),
});

// Buyer-facing preview of the exact fee checkout will charge — both read
// from the same calculateShippingRate() (see commerce-service/src/domain/
// shipping-rate.ts) so the quote never drifts from what actually gets billed.
export const ShippingQuoteRequestSchema = z.object({
  artworkIds: z.array(z.string().uuid()).min(1),
  buyerPostalCode: z.string().trim().min(1),
  // Required for a real Shippo rate lookup; the placeholder formula ignores
  // it and only uses buyerPostalCode.
  buyerCountry: z.string().trim().length(2, "Use a 2-letter country code, e.g. US").toUpperCase(),
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

export const ArtistProfileUpdateRequestSchema = z.object({
  displayName: z.string().trim().min(1).optional(),
  bio: z.string().trim().optional(),
  portfolioUrl: z.string().trim().url().optional().or(z.literal("")),
  imageUrl: z.string().trim().url().optional(),
  // Where the artist ships from — the location identifiers calculated
  // shipping needs (see shippingMethodEnum above). country is ISO
  // 3166-1 alpha-2 (e.g. "US", "VN", "FR") -- required for a real
  // carrier-rate API call (Shippo), optional for the placeholder formula.
  originPostalCode: z.string().trim().optional(),
  originCountry: z.string().trim().length(2, "Use a 2-letter country code, e.g. US").toUpperCase().optional(),
  // Required by at least USPS to purchase a real label (not just quote a
  // rate) via Shippo — without these, label purchase silently falls back
  // to the simulated waybill every time.
  originPhone: z.string().trim().optional(),
  originEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  // Confirmed live: Shippo will quote a rate without this but refuses to
  // purchase a label ("complete address information" required) for at
  // least US addresses. Optional since most countries have no concept of
  // state/province the way US/CA/AU do.
  originState: z.string().trim().optional(),
});

// --- Artist & Artwork --------------------------------------------------------

export const EnsureArtistProfileRequestSchema = z.object({
  displayName: z.string().trim().min(1),
});

const orientationEnum = z.enum(["portrait", "landscape", "square"]);
const editionTypeEnum = z.enum(["original", "limited-edition"]);
const availabilityEnum = z.enum(["available", "reserved", "sold"]);
const verificationDecisionEnum = z.enum(["verified", "rejected"]);
// Etsy-style per-listing choice: "flat_rate" is a fixed amount the artist
// sets themselves; "calculated" looks up a real carrier rate from
// packageWeightGrams + both parties' postal codes (rate lookup itself is a
// later phase — this is just the data model/UX choice).
const shippingMethodEnum = z.enum(["calculated", "flat_rate"]);

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
  packageWeightGrams: z.coerce.number().positive().optional(),
  shippingMethod: shippingMethodEnum.default("calculated"),
  flatRateAmount: z.coerce.number().nonnegative().optional(),
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
  imageUrl: z.string().trim().url().optional(),
  packageWeightGrams: z.coerce.number().positive().optional(),
  shippingMethod: shippingMethodEnum.optional(),
  flatRateAmount: z.coerce.number().nonnegative().optional(),
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

// carrier/trackingNumber are no longer supplied by the artist (Shipping
// Phase 3) -- the server generates a waybill itself (see
// commerce-service/src/domain/waybill.ts) so a shipment can't display a
// mistyped or fabricated tracking number.
export const ShipOrderRequestSchema = z.object({
  artistId: z.string().uuid(),
});

export const ConfirmReceivedRequestSchema = z.object({
  buyerId: z.string().uuid(),
});

export const OrderReviewRequestSchema = z.object({
  buyerId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().optional(),
});

// Period bucketing for the artist earnings aggregate (§4.7 of the defect
// audit). `from`/`to` default to a 90-day trailing window when omitted —
// enforced service-side, not here, since the default depends on "now".
export const ArtistEarningsQuerySchema = z.object({
  period: z.enum(["day", "week", "month"]).default("day"),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const ArtistTopArtworksQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  limit: z.coerce.number().int().positive().max(20).default(5),
});

export const AdminOrdersQuerySchema = z.object({
  status: z.enum(["pending", "confirmed", "paid", "shipped", "completed", "cancelled"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
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

// Recommendation owns privacy-preserving, once-per-artwork-per-viewer/day
// detail-view aggregates. The Gateway sends only the SHA-256 viewer hash;
// neither a Supabase user id nor the anonymous cookie value is persisted.
export const ArtworkViewRequestSchema = z.object({
  artworkId: z.string().uuid(),
  viewedOn: z.string().date(),
  viewerHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const RecordArtworkViewResponseSchema = z.object({
  recorded: z.boolean(),
});

export const ArtworkViewCountSchema = z.object({
  artworkId: z.string().uuid(),
  views: z.number().int().nonnegative(),
});

export const ArtistArtworkViewsQuerySchema = z
  .object({
    artistId: z.string().uuid(),
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((query) => query.from <= query.to, {
    message: "to must be on or after from",
    path: ["to"],
  });

export const ArtistArtworkViewsResponseSchema = z
  .object({
    artistId: z.string().uuid(),
    from: z.string().date(),
    to: z.string().date(),
    items: z.array(ArtworkViewCountSchema),
    totalViews: z.number().int().nonnegative(),
  })
  .refine((response) => response.from <= response.to, {
    message: "to must be on or after from",
    path: ["to"],
  })
  .refine((response) => response.totalViews === response.items.reduce((total, item) => total + item.views, 0), {
    message: "totalViews must equal the sum of per-artwork views",
    path: ["totalViews"],
  });

// Audience metric (§4.7): how many days back "the previous period" means.
export const ArtistAudienceQuerySchema = z.object({
  periodDays: z.coerce.number().int().positive().max(365).default(30),
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

// --- Room Preview: 3D Exhibitions --------------------------------------------------
// Distinct from the 2D Placement schema above (see 3D Exhibition
// Implementation Plan §11). Ownership travels in the request the same way
// buyerId does for CreatePlacementRequest: the Gateway establishes identity
// and role, requesterId/requesterRole let room-preview-service enforce it
// server-side (exhibition-repository.ts) rather than trusting the caller.
// Status starts at "draft" on create; only the update route can change it.

const exhibitionCreatorTypeSchema = z.enum(["artist", "admin"]);
const exhibitionStatusSchema = z.enum(["draft", "published", "archived"]);
const exhibitionSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase letters, numbers, and hyphens");

export const EXHIBITION_ROOM_TEMPLATE_IDS = [
  "white-cube",
  "warm-gallery",
  "black-box",
] as const;
export const ExhibitionRoomTemplateIdSchema = z.enum(EXHIBITION_ROOM_TEMPLATE_IDS);
export type ExhibitionRoomTemplateId = z.infer<typeof ExhibitionRoomTemplateIdSchema>;

// Capped at 10 (the fixed template size) so the existing placement position
// bounds (+/-5, see builderPositionX/Z below) and camera far plane stay
// valid without also having to widen those.
const exhibitionRoomDimensionSchema = z.coerce.number().finite().min(6).max(10);
const exhibitionWallColorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "wallColor must be a 6-digit hex color, e.g. #f5f3ee");

/** One wall segment in an Artsteps-style custom floor plan. */
const sceneWallSchema = z.object({
  id: z.string().min(1),
  start: z.tuple([z.number(), z.number()]),
  end: z.tuple([z.number(), z.number()]),
  height: z.number().positive().default(3.2),
  thickness: z.number().positive().default(0.15),
});

const exhibitionSceneLevelSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  elevation: z.number().finite().min(-100).max(100),
  floor: z.object({
    width: z.number().finite().positive().max(100),
    depth: z.number().finite().positive().max(100),
  }).strict(),
}).strict();

const exhibitionSceneWallSchema = z.object({
  id: z.string().trim().min(1).max(64),
  levelId: z.string().trim().min(1).max(64),
  start: z.tuple([z.number().finite(), z.number().finite()]),
  end: z.tuple([z.number().finite(), z.number().finite()]),
  height: z.number().finite().positive().max(20),
  thickness: z.number().finite().positive().max(2),
}).strict();

const exhibitionSceneColorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex color");
const exhibitionSceneStyleSchema = z.object({
  wallColor: exhibitionSceneColorSchema,
  floorColor: exhibitionSceneColorSchema,
  ceilingColor: exhibitionSceneColorSchema,
  environmentColor: exhibitionSceneColorSchema,
  lightColor: exhibitionSceneColorSchema,
  wallMaterial: z.enum(["matte", "satin", "polished"]),
  floorMaterial: z.enum(["matte", "satin", "polished"]),
  ambientLightIntensity: z.number().finite().min(0).max(4),
  directionalLightIntensity: z.number().finite().min(0).max(8),
}).strict();
const exhibitionSceneImagePlacementSchema = z.object({
  id: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(255),
  imageUrl: z.string().trim().min(1).max(2048),
  widthMeters: z.number().finite().positive().max(50),
  heightMeters: z.number().finite().positive().max(50),
  wallId: z.string().trim().min(1).max(64),
  positionX: z.number().finite(),
  positionY: z.number().finite().min(0).max(20),
  positionZ: z.number().finite(),
  rotationY: z.number().finite().min(-360).max(360),
}).strict();
const exhibitionSceneDoorSchema = z.object({
  id: z.string().trim().min(1).max(64),
  levelId: z.string().trim().min(1).max(64),
  wallId: z.string().trim().min(1).max(64),
  type: z.enum(["single", "double"]),
  along: z.number().finite().nonnegative(),
}).strict();

export const ExhibitionSceneDocumentSchema = z.object({
  version: z.literal(1),
  activeLevelId: z.string().trim().min(1).max(64),
  levels: z.array(exhibitionSceneLevelSchema).min(1).max(20),
  walls: z.array(exhibitionSceneWallSchema).max(500),
  doors: z.array(exhibitionSceneDoorSchema).max(500).optional(),
  style: exhibitionSceneStyleSchema.optional(),
  imagePlacements: z.array(exhibitionSceneImagePlacementSchema).max(200).optional(),
}).strict().superRefine((scene, context) => {
  const levelIds = new Set(scene.levels.map((level) => level.id));
  if (!levelIds.has(scene.activeLevelId)) {
    context.addIssue({ code: "custom", path: ["activeLevelId"], message: "activeLevelId must reference a level" });
  }
  scene.walls.forEach((wall, index) => {
    if (!levelIds.has(wall.levelId)) {
      context.addIssue({ code: "custom", path: ["walls", index, "levelId"], message: "wall levelId must reference a level" });
    }
  });
  scene.doors?.forEach((door, index) => {
    if (!levelIds.has(door.levelId)) {
      context.addIssue({ code: "custom", path: ["doors", index, "levelId"], message: "door levelId must reference a level" });
    }
    const wall = scene.walls.find((candidate) => candidate.id === door.wallId);
    if (!wall) {
      context.addIssue({ code: "custom", path: ["doors", index, "wallId"], message: "door wallId must reference a wall" });
    } else if (wall.levelId !== door.levelId) {
      context.addIssue({ code: "custom", path: ["doors", index, "levelId"], message: "door levelId must match its wall" });
    }
  });
});

export const CreateExhibitionRequestSchema = z.object({
  creatorType: exhibitionCreatorTypeSchema,
  creatorId: z.string().uuid(),
  title: z.string().trim().min(1),
  slug: exhibitionSlugSchema,
  description: z.string().trim().optional(),
  roomTemplateId: ExhibitionRoomTemplateIdSchema,
  roomWidth: exhibitionRoomDimensionSchema.optional(),
  roomDepth: exhibitionRoomDimensionSchema.optional(),
  wallColor: exhibitionWallColorSchema.optional(),
  wallSegments: z.array(sceneWallSchema).optional(),
  scene: ExhibitionSceneDocumentSchema.optional(),
  featured: z.boolean().optional(),
});

export const UpdateExhibitionRequestSchema = z.object({
  requesterId: z.string().uuid(),
  requesterRole: exhibitionCreatorTypeSchema,
  title: z.string().trim().min(1).optional(),
  slug: exhibitionSlugSchema.optional(),
  description: z.string().trim().optional(),
  roomTemplateId: ExhibitionRoomTemplateIdSchema.optional(),
  roomWidth: exhibitionRoomDimensionSchema.optional(),
  roomDepth: exhibitionRoomDimensionSchema.optional(),
  wallColor: exhibitionWallColorSchema.optional(),
  wallSegments: z.array(sceneWallSchema).optional(),
  scene: ExhibitionSceneDocumentSchema.optional(),
  status: exhibitionStatusSchema.optional(),
  featured: z.boolean().optional(),
});

export const CreateExhibitionPlacementRequestSchema = z.object({
  requesterId: z.string().uuid(),
  requesterRole: exhibitionCreatorTypeSchema,
  artworkId: z.string().uuid(),
  positionX: z.coerce.number().optional(),
  positionY: z.coerce.number().optional(),
  positionZ: z.coerce.number().optional(),
  rotationX: z.coerce.number().optional(),
  rotationY: z.coerce.number().optional(),
  rotationZ: z.coerce.number().optional(),
  scale: z.coerce.number().positive().optional(),
  wallId: z.string().trim().optional(),
  frameStyle: z.string().trim().optional(),
  order: z.coerce.number().int().optional(),
});

export const UpdateExhibitionPlacementRequestSchema = z.object({
  requesterId: z.string().uuid(),
  requesterRole: exhibitionCreatorTypeSchema,
  positionX: z.coerce.number().optional(),
  positionY: z.coerce.number().optional(),
  positionZ: z.coerce.number().optional(),
  rotationX: z.coerce.number().optional(),
  rotationY: z.coerce.number().optional(),
  rotationZ: z.coerce.number().optional(),
  scale: z.coerce.number().positive().optional(),
  wallId: z.string().trim().optional(),
  frameStyle: z.string().trim().optional(),
  order: z.coerce.number().int().optional(),
});

// Public Gateway inputs for the shared artist/admin exhibition builder. Actor
// identity is deliberately absent: the Gateway derives it from Supabase auth.
export const EXHIBITION_BUILDER_ROOM_TEMPLATE_ID = "white-cube" as const;

export const CreateExhibitionBuilderRequestSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: exhibitionSlugSchema,
  description: z.string().trim().max(2000).optional(),
  roomTemplateId: ExhibitionRoomTemplateIdSchema,
  roomWidth: exhibitionRoomDimensionSchema.optional(),
  roomDepth: exhibitionRoomDimensionSchema.optional(),
  wallColor: exhibitionWallColorSchema.optional(),
  wallSegments: z.array(sceneWallSchema).optional(),
  scene: ExhibitionSceneDocumentSchema.optional(),
}).strict();

export const UpdateExhibitionBuilderRequestSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  slug: exhibitionSlugSchema.optional(),
  description: z.string().trim().max(2000).optional(),
  roomWidth: exhibitionRoomDimensionSchema.optional(),
  roomDepth: exhibitionRoomDimensionSchema.optional(),
  wallColor: exhibitionWallColorSchema.optional(),
  wallSegments: z.array(sceneWallSchema).optional(),
  scene: ExhibitionSceneDocumentSchema.optional(),
  status: exhibitionStatusSchema.optional(),
  featured: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one exhibition field is required");

const builderPositionX = z.number().finite().min(-5).max(5);
const builderPositionY = z.number().finite().min(0).max(3.2);
const builderPositionZ = z.number().finite().min(-5).max(5);
const builderRotation = z.number().finite().min(-360).max(360);
const builderScale = z.number().finite().positive().max(5);
const builderWall = z.enum(["front", "back", "left", "right"]);
const builderFrame = z.enum(["dark-wood", "light-wood", "black", "white"]);

export const CreateExhibitionBuilderPlacementRequestSchema = z.object({
  artworkId: z.string().uuid(),
  positionX: builderPositionX,
  positionY: builderPositionY,
  positionZ: builderPositionZ,
  rotationX: builderRotation,
  rotationY: builderRotation,
  rotationZ: builderRotation,
  scale: builderScale,
  wallId: builderWall,
  frameStyle: builderFrame,
  order: z.number().int().nonnegative().optional(),
}).strict();

export const UpdateExhibitionBuilderPlacementRequestSchema = z.object({
  positionX: builderPositionX.optional(),
  positionY: builderPositionY.optional(),
  positionZ: builderPositionZ.optional(),
  rotationX: builderRotation.optional(),
  rotationY: builderRotation.optional(),
  rotationZ: builderRotation.optional(),
  scale: builderScale.optional(),
  wallId: builderWall.optional(),
  frameStyle: builderFrame.optional(),
  order: z.number().int().nonnegative().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one placement field is required");

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

// --- Gateway -> Commerce: Stripe webhook relay (Phase 6, G-04) --------------
// The Gateway's `POST /api/webhooks/stripe` verifies the raw-body HMAC
// signature (a step this schema deliberately does not — signature
// verification needs the exact raw bytes, not this already-parsed JSON)
// and relays the verified event to Commerce's `POST
// /v1/commerce/payments/webhook`. `data.object`'s shape varies by Stripe
// event type (Checkout Session, PaymentIntent, Charge, ...), so it's
// validated loosely here; the handler narrows it per `type`.
export const StripeWebhookRelaySchema = z.object({
  id: z.string().trim().min(1),
  type: z.string().trim().min(1),
  data: z.object({
    object: z.record(z.string(), z.unknown()),
  }),
});

export type ArtworkSearchQuery = z.infer<typeof ArtworkSearchQuerySchema>;
export type StripeWebhookRelay = z.infer<typeof StripeWebhookRelaySchema>;
export type ImageUploadResponse = z.infer<typeof ImageUploadResponseSchema>;
export type CheckoutClientRequest = z.infer<typeof CheckoutClientRequestSchema>;
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type CheckoutConfirmRequest = z.infer<typeof CheckoutConfirmRequestSchema>;
export type CheckoutCancelRequest = z.infer<typeof CheckoutCancelRequestSchema>;
export type ShippingQuoteRequest = z.infer<typeof ShippingQuoteRequestSchema>;
export type AccountSyncRequest = z.infer<typeof AccountSyncRequestSchema>;
export type AccountUpdateRequest = z.infer<typeof AccountUpdateRequestSchema>;
export type ArtistProfileUpdateRequest = z.infer<typeof ArtistProfileUpdateRequestSchema>;
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
export type ArtistEarningsQuery = z.infer<typeof ArtistEarningsQuerySchema>;
export type ArtistAudienceQuery = z.infer<typeof ArtistAudienceQuerySchema>;
export type ArtistTopArtworksQuery = z.infer<typeof ArtistTopArtworksQuerySchema>;
export type AdminOrdersQuery = z.infer<typeof AdminOrdersQuerySchema>;
export type ConfirmReceivedRequest = z.infer<typeof ConfirmReceivedRequestSchema>;
export type OrderReviewRequest = z.infer<typeof OrderReviewRequestSchema>;
export type ToggleSavedRequest = z.infer<typeof ToggleSavedRequestSchema>;
export type ToggleFollowRequest = z.infer<typeof ToggleFollowRequestSchema>;
export type ArtworkVerificationReviewRequest = z.infer<typeof ArtworkVerificationReviewRequestSchema>;
export type ArtistVerificationReviewRequest = z.infer<typeof ArtistVerificationReviewRequestSchema>;
export type CreateBuyerRoomRequest = z.infer<typeof CreateBuyerRoomRequestSchema>;
export type CreatePlacementRequest = z.infer<typeof CreatePlacementRequestSchema>;
export type CreateExhibitionRequest = z.infer<typeof CreateExhibitionRequestSchema>;
export type UpdateExhibitionRequest = z.infer<typeof UpdateExhibitionRequestSchema>;
export type CreateExhibitionPlacementRequest = z.infer<typeof CreateExhibitionPlacementRequestSchema>;
export type UpdateExhibitionPlacementRequest = z.infer<typeof UpdateExhibitionPlacementRequestSchema>;
export type CreateExhibitionBuilderRequest = z.infer<typeof CreateExhibitionBuilderRequestSchema>;
export type UpdateExhibitionBuilderRequest = z.infer<typeof UpdateExhibitionBuilderRequestSchema>;
export type CreateExhibitionBuilderPlacementRequest = z.infer<typeof CreateExhibitionBuilderPlacementRequestSchema>;
export type UpdateExhibitionBuilderPlacementRequest = z.infer<typeof UpdateExhibitionBuilderPlacementRequestSchema>;
export type CreateComplaintRequest = z.infer<typeof CreateComplaintRequestSchema>;
export type ResolveComplaintRequest = z.infer<typeof ResolveComplaintRequestSchema>;
