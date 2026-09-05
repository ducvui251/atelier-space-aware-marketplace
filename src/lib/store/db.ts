import type {
  Artist,
  Artwork,
  Complaint,
  Follow,
  MockUser,
  Order,
  Payment,
  Review,
  SavedArtwork,
  Shipment,
} from "@/types";
import { artists as seedArtists } from "@/data/artists";
import { artworks as seedArtworks } from "@/data/artworks";
import {
  seedComplaints,
  seedFollows,
  seedOrders,
  seedPayments,
  seedReviews,
  seedSavedArtworks,
  seedShipments,
  seedUsers,
} from "./seed";

export const STORAGE_KEY = "atelier:db:v1";
export const SESSION_KEY = "atelier:session:v1";

export interface DbState {
  users: MockUser[];
  artists: Artist[];
  artworks: Artwork[];
  orders: Order[];
  payments: Payment[];
  shipments: Shipment[];
  reviews: Review[];
  follows: Follow[];
  savedArtworks: SavedArtwork[];
  complaints: Complaint[];
  cart: string[];
}

export function createSeedDb(): DbState {
  return {
    users: seedUsers,
    artists: seedArtists,
    artworks: seedArtworks,
    orders: seedOrders,
    payments: seedPayments,
    shipments: seedShipments,
    reviews: seedReviews,
    follows: seedFollows,
    savedArtworks: seedSavedArtworks,
    complaints: seedComplaints,
    cart: [],
  };
}

export function loadDb(): DbState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DbState;
  } catch {
    return null;
  }
}

export function saveDb(db: DbState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage unavailable (private mode, quota) — state stays in-memory only.
  }
}

export function resetDb() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}

export function loadSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSessionUserId(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (userId) window.localStorage.setItem(SESSION_KEY, userId);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore — session just won't survive a reload.
  }
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}
