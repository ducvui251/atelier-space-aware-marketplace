"use client";

import * as React from "react";
import type {
  Artist,
  Artwork,
  ComplaintStatus,
  MockUser,
  Order,
  PaymentMethod,
  Review,
  Shipment,
  VerificationStatus,
} from "@/types";
import {
  createSeedDb,
  loadDb,
  loadSessionUserId,
  newId,
  resetDb,
  saveDb,
  saveSessionUserId,
  type DbState,
} from "./db";

export interface ArtworkFormInput {
  title: string;
  medium: string;
  widthCm: number;
  heightCm: number;
  price: number;
  currency: string;
  dominantColors: string[];
  style: string[];
  orientation: Artwork["orientation"];
  editionType: Artwork["editionType"];
  year: number;
  imageUrl: string;
  coaUrl?: string;
  description?: string;
}

interface CheckoutInput {
  artworkIds: string[];
  shippingAddress: Order["shippingAddress"];
  method: PaymentMethod;
  simulateFailure?: boolean;
}

type ActionResult = { success: true } | { error: string };

type CheckoutResult =
  | { success: true; orderIds: string[] }
  | { success: false; error: string; unavailableArtworkIds?: string[] };

export interface AppContextValue {
  ready: boolean;
  db: DbState;
  currentUser: MockUser | null;
  currentArtist: Artist | null;

  login(email: string, password: string): ActionResult;
  logout(): void;
  updateProfile(input: {
    fullName: string;
    phone?: string;
    bio?: string;
    portfolioUrl?: string;
  }): ActionResult;

  cartArtworkIds: string[];
  addToCart(artworkId: string): void;
  removeFromCart(artworkId: string): void;
  clearCart(): void;

  savedArtworkIds: string[];
  isSaved(artworkId: string): boolean;
  toggleSaved(artworkId: string): void;

  followedArtistIds: string[];
  isFollowing(artistId: string): boolean;
  toggleFollow(artistId: string): void;

  checkout(input: CheckoutInput): CheckoutResult;
  confirmReceived(orderId: string): void;
  submitReview(orderId: string, rating: number, comment?: string): void;
  fileComplaint(orderId: string, reason: string): void;
  markShipped(orderId: string, carrier: string, trackingNumber: string): void;

  createArtwork(input: ArtworkFormInput): { success: true; id: string } | { error: string };
  updateArtwork(id: string, input: ArtworkFormInput): ActionResult;

  reviewArtist(artistId: string, status: VerificationStatus, note?: string): void;
  reviewArtwork(artworkId: string, status: VerificationStatus, note?: string): void;
  resolveComplaint(complaintId: string, status: ComplaintStatus, note?: string): void;

  resetDemoData(): void;
}

export const AppContext = React.createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = React.useState<DbState>(createSeedDb);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const loaded = loadDb();
    if (loaded) setDb(loaded);
    setCurrentUserId(loadSessionUserId());
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    saveDb(db);
  }, [db, ready]);

  const currentUser = React.useMemo(
    () => db.users.find((u) => u.id === currentUserId) ?? null,
    [db.users, currentUserId],
  );

  const currentArtist = React.useMemo(
    () =>
      currentUser?.artistId
        ? db.artists.find((a) => a.id === currentUser.artistId) ?? null
        : null,
    [db.artists, currentUser],
  );

  const login = React.useCallback(
    (email: string, password: string): ActionResult => {
      const user = db.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!user || user.password !== password) {
        return { error: "Email hoặc mật khẩu không đúng." };
      }
      setCurrentUserId(user.id);
      saveSessionUserId(user.id);
      return { success: true };
    },
    [db.users],
  );

  const logout = React.useCallback(() => {
    setCurrentUserId(null);
    saveSessionUserId(null);
  }, []);

  const updateProfile = React.useCallback(
    (input: { fullName: string; phone?: string; bio?: string; portfolioUrl?: string }): ActionResult => {
      if (!currentUser) return { error: "Bạn cần đăng nhập." };
      if (!input.fullName.trim()) return { error: "Họ tên không được để trống." };
      setDb((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === currentUser.id
            ? { ...u, fullName: input.fullName.trim(), phone: input.phone }
            : u,
        ),
        artists: currentArtist
          ? prev.artists.map((a) =>
              a.id === currentArtist.id
                ? {
                    ...a,
                    displayName: input.fullName.trim(),
                    bio: input.bio ?? a.bio,
                    portfolioUrl: input.portfolioUrl ?? a.portfolioUrl,
                  }
                : a,
            )
          : prev.artists,
      }));
      return { success: true };
    },
    [currentUser, currentArtist],
  );

  const addToCart = React.useCallback((artworkId: string) => {
    setDb((prev) =>
      prev.cart.includes(artworkId) ? prev : { ...prev, cart: [...prev.cart, artworkId] },
    );
  }, []);

  const removeFromCart = React.useCallback((artworkId: string) => {
    setDb((prev) => ({ ...prev, cart: prev.cart.filter((id) => id !== artworkId) }));
  }, []);

  const clearCart = React.useCallback(() => {
    setDb((prev) => ({ ...prev, cart: [] }));
  }, []);

  const savedArtworkIds = React.useMemo(
    () =>
      currentUser
        ? db.savedArtworks.filter((s) => s.buyerId === currentUser.id).map((s) => s.artworkId)
        : [],
    [db.savedArtworks, currentUser],
  );

  const isSaved = React.useCallback(
    (artworkId: string) => savedArtworkIds.includes(artworkId),
    [savedArtworkIds],
  );

  const toggleSaved = React.useCallback(
    (artworkId: string) => {
      if (!currentUser) return;
      setDb((prev) => {
        const existing = prev.savedArtworks.find(
          (s) => s.buyerId === currentUser.id && s.artworkId === artworkId,
        );
        if (existing) {
          return {
            ...prev,
            savedArtworks: prev.savedArtworks.filter((s) => s.id !== existing.id),
          };
        }
        return {
          ...prev,
          savedArtworks: [
            ...prev.savedArtworks,
            { id: newId("saved"), buyerId: currentUser.id, artworkId },
          ],
        };
      });
    },
    [currentUser],
  );

  const followedArtistIds = React.useMemo(
    () =>
      currentUser
        ? db.follows.filter((f) => f.buyerId === currentUser.id).map((f) => f.artistId)
        : [],
    [db.follows, currentUser],
  );

  const isFollowing = React.useCallback(
    (artistId: string) => followedArtistIds.includes(artistId),
    [followedArtistIds],
  );

  const toggleFollow = React.useCallback(
    (artistId: string) => {
      if (!currentUser) return;
      setDb((prev) => {
        const existing = prev.follows.find(
          (f) => f.buyerId === currentUser.id && f.artistId === artistId,
        );
        if (existing) {
          return { ...prev, follows: prev.follows.filter((f) => f.id !== existing.id) };
        }
        return {
          ...prev,
          follows: [...prev.follows, { id: newId("follow"), buyerId: currentUser.id, artistId }],
        };
      });
    },
    [currentUser],
  );

  const checkout = React.useCallback(
    (input: CheckoutInput): CheckoutResult => {
      if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để checkout." };
      }
      const unavailable = input.artworkIds.filter((id) => {
        const artwork = db.artworks.find((a) => a.id === id);
        return !artwork || artwork.availability !== "available";
      });
      if (unavailable.length > 0) {
        return {
          success: false,
          error:
            "Một hoặc nhiều tác phẩm vừa chuyển sang reserved/sold. Vui lòng bỏ khỏi giỏ hàng và xem gợi ý tương tự.",
          unavailableArtworkIds: unavailable,
        };
      }
      if (input.simulateFailure) {
        return {
          success: false,
          error: "Thanh toán thất bại. Vui lòng thử lại hoặc đổi phương thức khác.",
        };
      }

      const plan = input.artworkIds.map((artworkId) => ({
        artworkId,
        orderId: newId("order"),
        paymentId: newId("payment"),
      }));

      setDb((prev) => {
        let artworks = prev.artworks;
        const newOrders: Order[] = [];
        const newPayments: DbState["payments"] = [];
        for (const step of plan) {
          const artwork = artworks.find((a) => a.id === step.artworkId);
          if (!artwork) continue;
          newOrders.push({
            id: step.orderId,
            buyerId: currentUser.id,
            artworkId: step.artworkId,
            editionType: artwork.editionType,
            totalAmount: artwork.price,
            currency: artwork.currency,
            status: "paid",
            createdAt: new Date().toISOString(),
            shippingAddress: input.shippingAddress,
          });
          newPayments.push({
            id: step.paymentId,
            orderId: step.orderId,
            amount: artwork.price,
            method: input.method,
            status: "success",
          });
          artworks = artworks.map((a) =>
            a.id === step.artworkId ? { ...a, availability: "sold" } : a,
          );
        }
        return {
          ...prev,
          artworks,
          orders: [...prev.orders, ...newOrders],
          payments: [...prev.payments, ...newPayments],
          cart: prev.cart.filter((id) => !input.artworkIds.includes(id)),
        };
      });

      return { success: true, orderIds: plan.map((p) => p.orderId) };
    },
    [currentUser, db.artworks],
  );

  const confirmReceived = React.useCallback((orderId: string) => {
    setDb((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === orderId ? { ...o, status: "completed" } : o)),
    }));
  }, []);

  const submitReview = React.useCallback(
    (orderId: string, rating: number, comment?: string) => {
      if (!currentUser) return;
      setDb((prev) => {
        const existing = prev.reviews.find((r) => r.orderId === orderId);
        const review: Review = {
          id: existing?.id ?? newId("review"),
          orderId,
          buyerId: currentUser.id,
          rating,
          comment,
        };
        return {
          ...prev,
          reviews: existing
            ? prev.reviews.map((r) => (r.id === review.id ? review : r))
            : [...prev.reviews, review],
        };
      });
    },
    [currentUser],
  );

  const fileComplaint = React.useCallback(
    (orderId: string, reason: string) => {
      if (!currentUser) return;
      setDb((prev) => ({
        ...prev,
        complaints: [
          ...prev.complaints,
          { id: newId("complaint"), orderId, reporterId: currentUser.id, reason, status: "open" },
        ],
      }));
    },
    [currentUser],
  );

  const markShipped = React.useCallback(
    (orderId: string, carrier: string, trackingNumber: string) => {
      setDb((prev) => {
        const existing = prev.shipments.find((s) => s.orderId === orderId);
        const shipment: Shipment = {
          id: existing?.id ?? newId("shipment"),
          orderId,
          carrier,
          trackingNumber,
          status: "in_transit",
        };
        return {
          ...prev,
          shipments: existing
            ? prev.shipments.map((s) => (s.id === shipment.id ? shipment : s))
            : [...prev.shipments, shipment],
          orders: prev.orders.map((o) => (o.id === orderId ? { ...o, status: "shipped" } : o)),
        };
      });
    },
    [],
  );

  const createArtwork = React.useCallback(
    (input: ArtworkFormInput) => {
      if (!currentArtist) return { error: "Bạn cần đăng nhập với tài khoản nghệ sĩ." };
      if (
        !input.title.trim() ||
        !input.medium.trim() ||
        !input.imageUrl.trim() ||
        !(input.price > 0) ||
        !(input.widthCm > 0) ||
        !(input.heightCm > 0)
      ) {
        return { error: "Vui lòng điền đầy đủ các trường bắt buộc (tên, chất liệu, kích thước, giá, ảnh)." };
      }
      const id = newId("aw");
      const artwork: Artwork = {
        id,
        artistId: currentArtist.id,
        artist: currentArtist.displayName,
        title: input.title.trim(),
        medium: input.medium.trim(),
        widthCm: input.widthCm,
        heightCm: input.heightCm,
        price: input.price,
        currency: input.currency || "USD",
        dominantColors: input.dominantColors,
        style: input.style,
        editionType: input.editionType,
        availability: "available",
        verificationStatus: "pending",
        imageUrl: input.imageUrl.trim(),
        orientation: input.orientation,
        year: input.year,
        description: input.description,
        coaUrl: input.coaUrl,
      };
      setDb((prev) => ({ ...prev, artworks: [...prev.artworks, artwork] }));
      return { success: true as const, id };
    },
    [currentArtist],
  );

  const updateArtwork = React.useCallback(
    (id: string, input: ArtworkFormInput): ActionResult => {
      if (!currentArtist) return { error: "Bạn cần đăng nhập với tài khoản nghệ sĩ." };
      const existing = db.artworks.find((a) => a.id === id && a.artistId === currentArtist.id);
      if (!existing) return { error: "Không tìm thấy tác phẩm của bạn." };
      if (!input.title.trim() || !input.medium.trim() || !input.imageUrl.trim() || !(input.price > 0)) {
        return { error: "Vui lòng điền đầy đủ các trường bắt buộc." };
      }
      setDb((prev) => ({
        ...prev,
        artworks: prev.artworks.map((a) =>
          a.id === id
            ? {
                ...a,
                ...input,
                title: input.title.trim(),
                medium: input.medium.trim(),
                imageUrl: input.imageUrl.trim(),
                verificationStatus: "pending",
                verificationNote: undefined,
                reviewedAt: undefined,
                reviewedBy: undefined,
              }
            : a,
        ),
      }));
      return { success: true };
    },
    [currentArtist, db.artworks],
  );

  const reviewArtist = React.useCallback(
    (artistId: string, status: VerificationStatus, note?: string) => {
      setDb((prev) => ({
        ...prev,
        artists: prev.artists.map((a) =>
          a.id === artistId
            ? { ...a, verificationStatus: status, verificationNote: note, reviewedAt: new Date().toISOString() }
            : a,
        ),
      }));
    },
    [],
  );

  const reviewArtwork = React.useCallback(
    (artworkId: string, status: VerificationStatus, note?: string) => {
      setDb((prev) => ({
        ...prev,
        artworks: prev.artworks.map((a) =>
          a.id === artworkId
            ? {
                ...a,
                verificationStatus: status,
                verificationNote: note,
                reviewedAt: new Date().toISOString(),
                reviewedBy: currentUser?.id,
              }
            : a,
        ),
      }));
    },
    [currentUser],
  );

  const resolveComplaint = React.useCallback(
    (complaintId: string, status: ComplaintStatus, note?: string) => {
      setDb((prev) => ({
        ...prev,
        complaints: prev.complaints.map((c) =>
          c.id === complaintId ? { ...c, status, resolutionNote: note } : c,
        ),
      }));
    },
    [],
  );

  const resetDemoData = React.useCallback(() => {
    resetDb();
    setDb(createSeedDb());
    setCurrentUserId(null);
  }, []);

  const value: AppContextValue = {
    ready,
    db,
    currentUser,
    currentArtist,
    login,
    logout,
    updateProfile,
    cartArtworkIds: db.cart,
    addToCart,
    removeFromCart,
    clearCart,
    savedArtworkIds,
    isSaved,
    toggleSaved,
    followedArtistIds,
    isFollowing,
    toggleFollow,
    checkout,
    confirmReceived,
    submitReview,
    fileComplaint,
    markShipped,
    createArtwork,
    updateArtwork,
    reviewArtist,
    reviewArtwork,
    resolveComplaint,
    resetDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
