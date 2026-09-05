import type { Order, Payment, Shipment } from "@atelier/contracts";
export const orders: Order[] = [
  { id: "order-1001", buyerId: "user-buyer-1", artworkId: "aw-04-silent-hall", editionType: "original", totalAmount: 890, currency: "USD", status: "shipped", createdAt: "2025-08-20T09:00:00.000Z", shippingAddress: { fullName: "Nguyễn Minh Anh", address: "12 Trần Phú", city: "Đà Nẵng", phone: "0901234567" } },
  { id: "order-1002", buyerId: "user-buyer-1", artworkId: "aw-08-below-the-freeway", editionType: "limited-edition", totalAmount: 610, currency: "USD", status: "completed", createdAt: "2025-06-02T09:00:00.000Z", shippingAddress: { fullName: "Nguyễn Minh Anh", address: "12 Trần Phú", city: "Đà Nẵng", phone: "0901234567" } },
  { id: "order-1003", buyerId: "user-buyer-1", artworkId: "aw-12-first-snow", editionType: "limited-edition", totalAmount: 470, currency: "USD", status: "shipped", createdAt: "2025-07-15T09:00:00.000Z", shippingAddress: { fullName: "Nguyễn Minh Anh", address: "12 Trần Phú", city: "Đà Nẵng", phone: "0901234567" } },
];
export const payments: Payment[] = [
  { id: "payment-1001", orderId: "order-1001", amount: 890, method: "card", status: "success" },
  { id: "payment-1002", orderId: "order-1002", amount: 610, method: "wallet", status: "success" },
  { id: "payment-1003", orderId: "order-1003", amount: 470, method: "card", status: "success" },
];
export const shipments: Shipment[] = [
  { id: "shipment-1001", orderId: "order-1001", carrier: "GHN Express", trackingNumber: "GHN123456789", status: "in_transit" },
  { id: "shipment-1002", orderId: "order-1002", carrier: "GHN Express", trackingNumber: "GHN987654321", status: "delivered" },
  { id: "shipment-1003", orderId: "order-1003", carrier: "Viettel Post", trackingNumber: "VTP555000111", status: "incident" },
];
