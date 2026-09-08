"use client";

import * as React from "react";
import { useAppState } from "./AppProvider";
import { apiFetch, ApiError } from "./api";

export { useAppState };

export function useAuth() {
  const { currentUser, currentArtist, login, register, logout, updateProfile, refreshUser, ready } = useAppState();
  return { currentUser, currentArtist, login, register, logout, updateProfile, refreshUser, ready };
}

export function useCart() {
  const { cartArtworkIds, cartItems, cartTotal, cartLoading, addToCart, removeFromCart, refreshCart } = useAppState();
  return { cartArtworkIds, items: cartItems, total: cartTotal, loading: cartLoading, addToCart, removeFromCart, refresh: refreshCart };
}

export function useSaved() {
  const { savedArtworkIds, savedItems, savedLoading, isSaved, toggleSaved } = useAppState();
  return { savedArtworkIds, items: savedItems, loading: savedLoading, isSaved, toggleSaved };
}

export function useFollows() {
  const { followedArtistIds, isFollowing, toggleFollow } = useAppState();
  return { followedArtistIds, isFollowing, toggleFollow };
}

interface ApiResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches a GET /api/* resource on mount and whenever `path` changes. Pass
 * `null` to skip fetching (e.g. while waiting for auth state to resolve).
 */
export function useApiResource<T>(path: string | null): ApiResourceState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(Boolean(path));
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch<T>(path)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Không thể tải dữ liệu.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { data, loading, error, refresh: () => setTick((t) => t + 1) };
}
