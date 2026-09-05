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
export type DiscoveryView = "catalog" | "room";
export type UserRole = "buyer" | "artist" | "admin";

export interface MockUser {
  id: string; fullName: string; email: string; password: string; phone?: string;
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
export type ComplaintStatus = "open" | "resolved" | "rejected";
export interface Complaint { id: string; orderId: string; reporterId: string; reason: string; status: ComplaintStatus; resolutionNote?: string; }

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
export * from "./v1";
