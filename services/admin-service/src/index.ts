import type { ServiceDefinition } from "@atelier/contracts";
export { getAdminStats, getOpenComplaints } from "./application/admin";
export { health } from "./health";
export { complaints } from "./infrastructure/complaints";

export const ADMIN_SERVICE: ServiceDefinition = {
  name: "admin",
  version: "v1",
  owns: ["moderation", "complaints", "audit-records", "reports"],
};
