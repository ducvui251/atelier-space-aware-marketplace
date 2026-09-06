import type { Complaint } from "@atelier/contracts";
import { requestService } from "../http-client";

export function getVerificationQueue() { return requestService<{ artists: unknown[]; artworks: unknown[] }>("admin", "/v1/admin/verification-queue"); }
export function getAdminStats() { return requestService<Record<string, number>>("admin", "/v1/admin/stats"); }
export function getComplaints() { return requestService<{ items: Complaint[]; total: number }>("admin", "/v1/admin/complaints"); }
export function createComplaint(input: Record<string, unknown>) { return requestService<Complaint>("admin", "/v1/admin/complaints", { method: "POST", body: input }); }
export function resolveComplaint(id: string, input: Record<string, unknown>) { return requestService<Complaint>("admin", `/v1/admin/complaints/${encodeURIComponent(id)}/resolve`, { method: "POST", body: input }); }
