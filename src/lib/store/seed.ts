import type {
  Complaint,
  Follow,
  MockUser,
  Order,
  Payment,
  Review,
  SavedArtwork,
  Shipment,
} from "@/types";

/**
 * Seed data for the mock backend. Passwords are plain text on purpose — this
 * is a local, no-network demo layer, never a real auth system.
 */
export const seedUsers: MockUser[] = [
  {
    id: "user-buyer-1",
    fullName: "Nguyễn Minh Anh",
    email: "buyer1@atelier.test",
    password: "buyer123",
    phone: "0901234567",
    role: "buyer",
    createdAt: "2024-01-10T00:00:00.000Z",
  },
  {
    id: "user-artist-lena",
    fullName: "Lena Moreau",
    email: "artist1@atelier.test",
    password: "artist123",
    phone: "0912345678",
    role: "artist",
    createdAt: "2023-11-02T00:00:00.000Z",
    artistId: "artist-lena-moreau",
  },
  {
    id: "user-artist-maria",
    fullName: "Maria Wood",
    email: "artist2@atelier.test",
    password: "artist123",
    phone: "0987654321",
    role: "artist",
    createdAt: "2024-02-18T00:00:00.000Z",
    artistId: "artist-maria-wood",
  },
  {
    id: "user-admin",
    fullName: "Atelier Admin",
    email: "admin1@atelier.test",
    password: "admin123",
    role: "admin",
    createdAt: "2023-09-01T00:00:00.000Z",
  },
];

export const seedOrders: Order[] = [
  {
    id: "order-1001",
    buyerId: "user-buyer-1",
    artworkId: "aw-04-silent-hall",
    editionType: "original",
    totalAmount: 890,
    currency: "USD",
    status: "shipped",
    createdAt: "2025-08-20T09:00:00.000Z",
    shippingAddress: {
      fullName: "Nguyễn Minh Anh",
      address: "12 Trần Phú",
      city: "Đà Nẵng",
      phone: "0901234567",
    },
  },
  {
    id: "order-1002",
    buyerId: "user-buyer-1",
    artworkId: "aw-08-below-the-freeway",
    editionType: "limited-edition",
    totalAmount: 610,
    currency: "USD",
    status: "completed",
    createdAt: "2025-06-02T09:00:00.000Z",
    shippingAddress: {
      fullName: "Nguyễn Minh Anh",
      address: "12 Trần Phú",
      city: "Đà Nẵng",
      phone: "0901234567",
    },
  },
  {
    id: "order-1003",
    buyerId: "user-buyer-1",
    artworkId: "aw-12-first-snow",
    editionType: "limited-edition",
    totalAmount: 470,
    currency: "USD",
    status: "shipped",
    createdAt: "2025-07-15T09:00:00.000Z",
    shippingAddress: {
      fullName: "Nguyễn Minh Anh",
      address: "12 Trần Phú",
      city: "Đà Nẵng",
      phone: "0901234567",
    },
  },
];

export const seedPayments: Payment[] = [
  { id: "payment-1001", orderId: "order-1001", amount: 890, method: "card", status: "success" },
  { id: "payment-1002", orderId: "order-1002", amount: 610, method: "wallet", status: "success" },
  { id: "payment-1003", orderId: "order-1003", amount: 470, method: "card", status: "success" },
];

export const seedShipments: Shipment[] = [
  {
    id: "shipment-1001",
    orderId: "order-1001",
    carrier: "GHN Express",
    trackingNumber: "GHN123456789",
    status: "in_transit",
  },
  {
    id: "shipment-1002",
    orderId: "order-1002",
    carrier: "GHN Express",
    trackingNumber: "GHN987654321",
    status: "delivered",
  },
  {
    id: "shipment-1003",
    orderId: "order-1003",
    carrier: "Viettel Post",
    trackingNumber: "VTP555000111",
    status: "incident",
  },
];

export const seedReviews: Review[] = [
  {
    id: "review-1002",
    orderId: "order-1002",
    buyerId: "user-buyer-1",
    rating: 5,
    comment: "Đóng gói cẩn thận, tranh đẹp hơn cả ảnh chụp.",
  },
];

export const seedComplaints: Complaint[] = [
  {
    id: "complaint-1003",
    orderId: "order-1003",
    reporterId: "user-buyer-1",
    reason: "Khung tranh bị nứt góc khi nhận hàng, cần hỗ trợ đổi khung mới.",
    status: "open",
  },
];

export const seedFollows: Follow[] = [
  { id: "follow-1", buyerId: "user-buyer-1", artistId: "artist-lena-moreau" },
];

export const seedSavedArtworks: SavedArtwork[] = [
  { id: "saved-1", buyerId: "user-buyer-1", artworkId: "aw-05-infinite-courtyard" },
];
