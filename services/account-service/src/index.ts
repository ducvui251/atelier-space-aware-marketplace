import type { ServiceDefinition } from "@atelier/contracts";
export { users } from "./infrastructure/users";
export { authenticate, findAccount } from "./application/account";
export { health } from "./health";

export const ACCOUNT_SERVICE: ServiceDefinition = {
  name: "account",
  version: "v1",
  owns: ["users", "roles", "sessions"],
};
