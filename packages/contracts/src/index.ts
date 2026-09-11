export type ArtworkOrientation = "portrait" | "landscape" | "square";
export type EditionType = "original" | "limited-edition";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type Availability = "available" | "reserved" | "sold";

export interface Artwork {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  price: number;
  currency: string;
  widthCm: number;
  heightCm: number;
  medium: string;
  style: string[];
  dominantColors: string[];
  editionType: EditionType;
  availability: Availability;
  verificationStatus: VerificationStatus;
  imageUrl: string;
  orientation: ArtworkOrientation;
  year: number;
  description?: string;
  coaUrl?: string;
  verificationNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface Artist {
  id: string;
  userId?: string;
  displayName: string;
  location: string;
  nationality: string;
  bio: string;
  verificationStatus: VerificationStatus;
  imageUrl: string;
  portfolioUrl?: string;
  verificationNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Collection { id: string; title: string; description: string; imageUrl: string; artworkCount: number; }
export interface RoomPreset { id: string; name: string; imageUrl: string; }
export interface BuyerRoom {
  id: string; buyerId: string; name: string; roomType: string; wallColor?: string; imageUrl?: string; createdAt: string;
}
export interface Placement {
  id: string; roomId: string; artworkId: string; scale: number; positionX: number; positionY: number; rotation: number; createdAt: string;
}
export type DiscoveryView = "catalog" | "room";
export type UserRole = "buyer" | "artist" | "admin";

/**
 * Account profile synchronized from a verified Supabase identity.
 * `password` exists only because the legacy demo auth path used it; new
 * consumers must treat this shape as a profile, never as credentials.
 */
export interface AccountProfile {
  id: string; fullName: string; email: string; phone?: string;
  role: UserRole; createdAt: string; artistId?: string;
}

export type OrderStatus = "pending" | "confirmed" | "paid" | "shipped" | "completed" | "cancelled";
export interface Order {
  id: string; buyerId: string; artworkId: string; editionType: EditionType;
  totalAmount: number; currency: string; status: OrderStatus; createdAt: string;
  shippingAddress: { fullName: string; address: string; city: string; phone: string };
}
export type PaymentMethod = "card" | "wallet";
export type PaymentStatus = "pending" | "success" | "failed" | "refunded";
export interface Payment { id: string; orderId: string; amount: number; method: PaymentMethod; status: PaymentStatus; }
export type ShipmentStatus = "packing" | "in_transit" | "delivered" | "incident";
export interface Shipment { id: string; orderId: string; carrier?: string; trackingNumber?: string; status: ShipmentStatus; }
export interface Review { id: string; orderId: string; buyerId: string; rating: number; comment?: string; }
export interface Follow { id: string; buyerId: string; artistId: string; }
export interface SavedArtwork { id: string; buyerId: string; artworkId: string; }

/**
 * Audience metric (§4.7 of the defect audit): reconstructed from an
 * append-only follow_events ledger, not the live recommendation.follows
 * table (which loses history on unfollow — see follow_events for why).
 */
export interface ArtistAudience {
  artistId: string;
  periodDays: number;
  totalFollowers: number;
  followersPreviousPeriod: number;
  growth: number;
}

export interface ArtworkSaveCount { artworkId: string; saves: number; }

/**
 * Admin overview chart data (§4.6 of the defect audit). `revenueTrend` is
 * "amount collected" (order_feed status paid/shipped) — there is no
 * completed/refunded status in admin.order_feed today (see
 * getOrderFeedTrend in admin-repository.ts for why), so this is not a
 * full order lifecycle view yet.
 */
export interface AdminStats {
  pendingArtists: number;
  pendingArtworks: number;
  openComplaints: number;
  totalOrders: number;
  revenue: number;
  revenueTrend: { period: "day"; from: string; to: string; timezone: "UTC"; currency: string; series: { period: string; amount: number }[] };
  orderStatusCounts: Record<string, number>;
  verificationStatusCounts: { artists: Record<string, number>; artworks: Record<string, number> };
  complaintStatusCounts: Record<string, number>;
}
export type ComplaintStatus = "open" | "resolved" | "rejected";
export interface Complaint { id: string; orderId: string; reporterId: string; reason: string; status: ComplaintStatus; resolutionNote?: string; }

/**
 * Commerce's per-artist earnings aggregate (§4.7 of the defect audit).
 * No platform commission is modeled anywhere in this system yet, so
 * `received`/`pendingPayment`/`refunded`/trend `net` are gross buyer-paid
 * amounts, not a post-fee payout — there is also no real settlement/payout
 * integration (e.g. Stripe Connect transfers) behind "received": it means
 * "payment succeeded and not refunded," not "money has left Stripe's
 * account." Both are honest read-outs of what this system can actually
 * prove today, not a substitute for an actual payout ledger.
 */
export interface ArtistEarnings {
  artistId: string;
  currency: string;
  period: "day" | "week" | "month";
  from: string;
  to: string;
  received: number;
  pendingPayment: number;
  refunded: number;
  orderCounts: { processing: number; shipped: number; completed: number; cancelled: number; refunded: number };
  trend: { period: string; net: number }[];
}

export const SERVICE_NAMES = [
  "account", "catalog-discovery", "artist-artwork", "commerce",
  "recommendation", "verification", "room-preview", "admin",
] as const;
export type ServiceName = (typeof SERVICE_NAMES)[number];

export interface ServiceDefinition { name: ServiceName; version: "v1"; owns: readonly string[]; }
export interface ServiceHealth { service: ServiceName; version: "v1"; status: "ok"; timestamp: string; }
export interface DomainEvent<TPayload = unknown> {
  id: string; type: string; version: "v1"; occurredAt: string;
  correlationId: string; source: ServiceName; payload: TPayload;
}
export interface ApiError { code: string; message: string; correlationId: string; }
export * from "./v1.ts";
