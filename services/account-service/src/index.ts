import type { ServiceDefinition } from "@atelier/contracts";
export { health } from "./health.ts";

export const ACCOUNT_SERVICE: ServiceDefinition = {
  name: "account",
  version: "v1",
  owns: ["users", "roles", "sessions"],
};
