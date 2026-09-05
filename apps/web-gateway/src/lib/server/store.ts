import { createSeedDb, type DbState } from "@/lib/store/db";

/**
 * Stateless request fixture for the mock REST API. The browser demo keeps its
 * interactive state in localStorage; a real deployment replaces this adapter
 * with service-owned persistence without changing Gateway routes.
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

export function getServerDb(): ServerDbState { return seed(); }
export function setServerDb(next: ServerDbState): void { void next; /* Persistence is a service deployment concern. */ }
export function resetServerDb(): void { /* Stateless adapter: the next request receives fresh fixtures. */ }

export function getCart(userId: string): string[] {
  return getServerDb().cartsByUser[userId] ?? [];
}
