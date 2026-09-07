import type { ServiceDefinition } from "@atelier/contracts";
export { getAdminStats, getOpenComplaints } from "./application/admin.ts";
export { health } from "./health.ts";
export { complaints } from "./infrastructure/complaints.ts";

export const ADMIN_SERVICE: ServiceDefinition = {
  name: "admin",
  version: "v1",
  owns: ["moderation", "complaints", "audit-records", "reports"],
};
