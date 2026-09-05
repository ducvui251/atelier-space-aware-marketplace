"use client";

import * as React from "react";
import type { Artwork, Order } from "@/types";
import { AppContext, type AppContextValue } from "./AppProvider";
import type { DbState } from "./db";

export function useAppState(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within <AppProvider>");
  return ctx;
}

export function useAuth() {
  const { currentUser, currentArtist, login, logout, updateProfile, ready } = useAppState();
  return { currentUser, currentArtist, login, logout, updateProfile, ready };
}

export function useCart() {
  const { cartArtworkIds, addToCart, removeFromCart, clearCart, db } = useAppState();
  const items = cartArtworkIds
    .map((id) => db.artworks.find((a) => a.id === id))
    .filter((a): a is Artwork => Boolean(a));
  const total = items.reduce((sum, a) => sum + a.price, 0);
  return { cartArtworkIds, items, total, addToCart, removeFromCart, clearCart };
}

export function useSaved() {
  const { savedArtworkIds, isSaved, toggleSaved, db } = useAppState();
  const items = savedArtworkIds
    .map((id) => db.artworks.find((a) => a.id === id))
    .filter((a): a is Artwork => Boolean(a));
  return { savedArtworkIds, items, isSaved, toggleSaved };
}

export function ordersForBuyer(db: DbState, buyerId: string): Order[] {
  return db.orders
    .filter((o) => o.buyerId === buyerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function ordersForArtist(db: DbState, artistId: string): Order[] {
  const artworkIds = new Set(db.artworks.filter((a) => a.artistId === artistId).map((a) => a.id));
  return db.orders
    .filter((o) => artworkIds.has(o.artworkId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function artworksForArtist(db: DbState, artistId: string): Artwork[] {
  return db.artworks.filter((a) => a.artistId === artistId);
}
