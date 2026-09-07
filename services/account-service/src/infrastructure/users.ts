import type { MockUser } from "@atelier/contracts";

export const users: MockUser[] = [
  { id: "user-buyer-1", fullName: "Nguyễn Minh Anh", email: "buyer1@atelier.test", password: "buyer123", phone: "0901234567", role: "buyer", createdAt: "2024-01-10T00:00:00.000Z" },
  { id: "user-artist-lena", fullName: "Lena Moreau", email: "artist1@atelier.test", password: "artist123", phone: "0912345678", role: "artist", createdAt: "2023-11-02T00:00:00.000Z", artistId: "artist-lena-moreau" },
  { id: "user-artist-maria", fullName: "Maria Wood", email: "artist2@atelier.test", password: "artist123", phone: "0987654321", role: "artist", createdAt: "2024-02-18T00:00:00.000Z", artistId: "artist-maria-wood" },
  { id: "user-admin", fullName: "Atelier Admin", email: "admin1@atelier.test", password: "admin123", role: "admin", createdAt: "2023-09-01T00:00:00.000Z" },
];
