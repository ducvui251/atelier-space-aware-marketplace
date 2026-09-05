import type { Complaint } from "@atelier/contracts";
export function getOpenComplaints(complaints: readonly Complaint[]): Complaint[] { return complaints.filter((complaint) => complaint.status === "open"); }
export function getAdminStats(input: { users: readonly unknown[]; artists: readonly unknown[]; artworks: readonly unknown[]; orders: readonly unknown[]; complaints: readonly Complaint[] }) {
  return { users: input.users.length, artists: input.artists.length, artworks: input.artworks.length, orders: input.orders.length, openComplaints: getOpenComplaints(input.complaints).length };
}
