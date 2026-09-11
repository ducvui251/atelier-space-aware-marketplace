"use client";

import * as React from "react";
import type { AccountProfile, Artist, Artwork } from "@/types";
import { apiFetch, ApiError } from "./api";

type ActionResult = { success: true } | { error: string };

export interface AppContextValue {
  ready: boolean;
  currentUser: AccountProfile | null;
  currentArtist: Artist | null;
  login(email: string, password: string): Promise<ActionResult>;
  logout(): Promise<void>;
  updateProfile(input: { fullName: string; phone?: string; bio?: string; portfolioUrl?: string }): Promise<ActionResult>;
  refreshUser(): Promise<void>;

  cartItems: Artwork[];
  cartArtworkIds: string[];
  cartTotal: number;
  cartLoading: boolean;
  addToCart(artworkId: string): Promise<ActionResult>;
  removeFromCart(artworkId: string): Promise<void>;
  refreshCart(): Promise<void>;

  savedItems: Artwork[];
  savedArtworkIds: string[];
  savedLoading: boolean;
  isSaved(artworkId: string): boolean;
  toggleSaved(artworkId: string): Promise<void>;

  followedArtistIds: string[];
  isFollowing(artistId: string): boolean;
  toggleFollow(artistId: string): Promise<void>;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function useAppState(): AppContextValue {
  const value = React.useContext(AppContext);
  if (!value) throw new Error("useAppState must be used within AppProvider");
  return value;
}

interface MeResponse {
  user: AccountProfile | null;
  artistProfile: Artist | null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<AccountProfile | null>(null);
  const [currentArtist, setCurrentArtist] = React.useState<Artist | null>(null);

  const [cartItems, setCartItems] = React.useState<Artwork[]>([]);
  const [cartLoading, setCartLoading] = React.useState(false);
  const [savedItems, setSavedItems] = React.useState<Artwork[]>([]);
  const [savedLoading, setSavedLoading] = React.useState(false);
  const [followedArtistIds, setFollowedArtistIds] = React.useState<string[]>([]);

  const refreshUser = React.useCallback(async () => {
    try {
      const result = await apiFetch<MeResponse>("/api/account/me");
      setCurrentUser(result.user);
      setCurrentArtist(result.artistProfile);
    } catch {
      setCurrentUser(null);
      setCurrentArtist(null);
    }
  }, []);

  const refreshCart = React.useCallback(async () => {
    setCartLoading(true);
    try {
      const result = await apiFetch<{ items: Artwork[]; total: number }>("/api/cart");
      setCartItems(result.items);
    } catch {
      setCartItems([]);
    } finally {
      setCartLoading(false);
    }
  }, []);

  const refreshSaved = React.useCallback(async () => {
    setSavedLoading(true);
    try {
      const result = await apiFetch<{ items: Artwork[]; total: number }>("/api/saved");
      setSavedItems(result.items);
    } catch {
      setSavedItems([]);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  const refreshFollows = React.useCallback(async () => {
    try {
      const result = await apiFetch<{ artistIds: string[]; total: number }>("/api/follows");
      setFollowedArtistIds(result.artistIds);
    } catch {
      setFollowedArtistIds([]);
    }
  }, []);

  React.useEffect(() => {
    refreshUser().finally(() => setReady(true));
  }, [refreshUser]);

  React.useEffect(() => {
    if (!ready) return;
    if (!currentUser) {
      setCartItems([]);
      setSavedItems([]);
      setFollowedArtistIds([]);
      return;
    }
    refreshCart();
    refreshSaved();
    refreshFollows();
    // Only re-run when the signed-in user actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, currentUser?.id]);

  const login = React.useCallback(
    async (email: string, password: string): Promise<ActionResult> => {
      try {
        await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        await refreshUser();
        return { success: true };
      } catch (error) {
        return { error: error instanceof ApiError ? error.message : "Incorrect email or password." };
      }
    },
    [refreshUser],
  );

  const logout = React.useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setCurrentUser(null);
    setCurrentArtist(null);
    setCartItems([]);
    setSavedItems([]);
    setFollowedArtistIds([]);
  }, []);

  const updateProfile = React.useCallback(
    async (input: { fullName: string; phone?: string; bio?: string; portfolioUrl?: string }): Promise<ActionResult> => {
      try {
        const result = await apiFetch<MeResponse>("/api/account/me", { method: "PATCH", body: JSON.stringify(input) });
        setCurrentUser(result.user);
        setCurrentArtist(result.artistProfile);
        return { success: true };
      } catch (error) {
        return { error: error instanceof ApiError ? error.message : "Couldn't save changes." };
      }
    },
    [],
  );

  const addToCart = React.useCallback(
    async (artworkId: string): Promise<ActionResult> => {
      try {
        await apiFetch("/api/cart", { method: "POST", body: JSON.stringify({ artworkId }) });
        await refreshCart();
        return { success: true };
      } catch (error) {
        return { error: error instanceof ApiError ? error.message : "Couldn't add to cart." };
      }
    },
    [refreshCart],
  );

  const removeFromCart = React.useCallback(
    async (artworkId: string) => {
      await apiFetch(`/api/cart/${encodeURIComponent(artworkId)}`, { method: "DELETE" });
      await refreshCart();
    },
    [refreshCart],
  );

  const savedArtworkIds = React.useMemo(() => savedItems.map((item) => item.id), [savedItems]);
  const isSaved = React.useCallback((artworkId: string) => savedArtworkIds.includes(artworkId), [savedArtworkIds]);

  const toggleSaved = React.useCallback(
    async (artworkId: string) => {
      if (!currentUser) return;
      await apiFetch(`/api/saved/${encodeURIComponent(artworkId)}`, { method: "POST" });
      await refreshSaved();
    },
    [currentUser, refreshSaved],
  );

  const isFollowing = React.useCallback((artistId: string) => followedArtistIds.includes(artistId), [followedArtistIds]);

  const toggleFollow = React.useCallback(
    async (artistId: string) => {
      if (!currentUser) return;
      const result = await apiFetch<{ following: boolean }>(`/api/follows/${encodeURIComponent(artistId)}`, { method: "POST" });
      setFollowedArtistIds((prev) => (result.following ? [...prev, artistId] : prev.filter((id) => id !== artistId)));
    },
    [currentUser],
  );

  const cartTotal = React.useMemo(() => cartItems.reduce((sum, item) => sum + item.price, 0), [cartItems]);
  const cartArtworkIds = React.useMemo(() => cartItems.map((item) => item.id), [cartItems]);

  const value: AppContextValue = {
    ready,
    currentUser,
    currentArtist,
    login,
    logout,
    updateProfile,
    refreshUser,
    cartItems,
    cartArtworkIds,
    cartTotal,
    cartLoading,
    addToCart,
    removeFromCart,
    refreshCart,
    savedItems,
    savedArtworkIds,
    savedLoading,
    isSaved,
    toggleSaved,
    followedArtistIds,
    isFollowing,
    toggleFollow,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
