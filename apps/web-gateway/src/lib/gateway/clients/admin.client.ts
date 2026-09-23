import type { AdminStats, Artist, Artwork, Complaint, Order, Shipment } from "@atelier/contracts";
import { requestService } from "../http-client";

export function getVerificationQueue() { return requestService<{ artists: unknown[]; artworks: unknown[] }>("admin", "/v1/admin/verification-queue"); }
export function getAdminStats() { return requestService<AdminStats>("admin", "/v1/admin/stats", { timeoutMs: 5000 }); }
export function getComplaints() { return requestService<{ items: Complaint[]; total: number }>("admin", "/v1/admin/complaints"); }
export function createComplaint(input: Record<string, unknown>) { return requestService<Complaint>("admin", "/v1/admin/complaints", { method: "POST", body: input }); }
export function resolveComplaint(id: string, input: Record<string, unknown>) { return requestService<Complaint>("admin", `/v1/admin/complaints/${encodeURIComponent(id)}/resolve`, { method: "POST", body: input }); }
export function getAdminOrders(params: { status?: string; page: number; limit: number }) {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.status) query.set("status", params.status);
  return requestService<{ items: (Order & { shipment: Shipment | null })[]; total: number }>("admin", `/v1/admin/orders?${query.toString()}`);
}
export function getAdminArtworks(params: { status?: string; q?: string; page: number; limit: number }) {
  const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.status) query.set("status", params.status);
  if (params.q) query.set("q", params.q);
  return requestService<{ items: Artwork[]; total: number }>("admin", `/v1/admin/artworks?${query.toString()}`);
}
export function getAdminArtists(params: { status?: string }) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  return requestService<{ items: Artist[]; total: number }>("admin", `/v1/admin/artists?${query.toString()}`);
}
