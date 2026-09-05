import type { MockUser } from "@atelier/contracts";

export function findUserByEmail(users: readonly MockUser[], email: string, password: string): MockUser | undefined {
  return users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password);
}

export function getUserById(users: readonly MockUser[], userId: string): MockUser | undefined {
  return users.find((user) => user.id === userId);
}
