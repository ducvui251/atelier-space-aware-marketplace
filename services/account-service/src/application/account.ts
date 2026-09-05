import type { MockUser } from "@atelier/contracts";
import { findUserByEmail, getUserById } from "../domain/account-rules";

export function authenticate(users: readonly MockUser[], email: string, password: string): MockUser | undefined {
  return findUserByEmail(users, email, password);
}

export function findAccount(users: readonly MockUser[], userId: string): MockUser | undefined {
  return getUserById(users, userId);
}
