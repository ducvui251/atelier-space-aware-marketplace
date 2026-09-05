import { createSeedDb, type DbState } from "@/lib/store/db";

/**
 * Server-side mock "database" for the REST API layer. This is intentionally
 * separate from the browser's localStorage-backed store used by the UI — it
 * lives in the Node process memory (via globalThis, so it survives Next.js
 * dev hot-reload) and resets whenever the dev server restarts. It exists so
 * the documented REST API has something real to read/write when you test it
 * with Swagger UI or curl, independent of what's in your browser tab.
 */
export interface ServerDbState extends Omit<DbState, "cart"> {
  cartsByUser: Record<string, string[]>;
}

function seed(): ServerDbState {
  const base = createSeedDb();
  return {
    users: base.users,
    artists: base.artists,
    artworks: base.artworks,
    orders: base.orders,
    payments: base.payments,
    shipments: base.shipments,
    reviews: base.reviews,
    follows: base.follows,
    savedArtworks: base.savedArtworks,
    complaints: base.complaints,
    cartsByUser: {},
  };
}

const globalForStore = globalThis as unknown as { __atelierServerDb?: ServerDbState };

export function getServerDb(): ServerDbState {
  if (!globalForStore.__atelierServerDb) {
    globalForStore.__atelierServerDb = seed();
  }
  return globalForStore.__atelierServerDb;
}

export function setServerDb(next: ServerDbState) {
  globalForStore.__atelierServerDb = next;
}

export function resetServerDb() {
  globalForStore.__atelierServerDb = seed();
}

export function getCart(userId: string): string[] {
  return getServerDb().cartsByUser[userId] ?? [];
}
