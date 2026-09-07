import type { ServiceDefinition } from "@atelier/contracts";
export { users } from "./infrastructure/users.ts";
export { authenticate, findAccount } from "./application/account.ts";
export { health } from "./health.ts";

export const ACCOUNT_SERVICE: ServiceDefinition = {
  name: "account",
  version: "v1",
  owns: ["users", "roles", "sessions"],
};
