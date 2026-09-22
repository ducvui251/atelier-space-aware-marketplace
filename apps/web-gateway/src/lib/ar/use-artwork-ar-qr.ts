"use client";

import * as React from "react";
import { apiFetch } from "@/lib/client/api";

/**
 * Fetches the phone-reachable AR link for an artwork and renders it as a
 * QR code — shared by the desktop "View in AR" QR modal and (as a
 * same-device fallback) the inline AR viewer.
 */
export function useArtworkArQr(artworkId: string) {
  const [arLink, setArLink] = React.useState<string | null | undefined>(undefined);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<{ url: string | null }>(`/api/artworks/${encodeURIComponent(artworkId)}/ar-link`)
      .then((result) => {
        if (!cancelled) setArLink(result.url);
      })
      .catch(() => {
        if (!cancelled) setArLink(null);
      });
    return () => {
      cancelled = true;
    };
  }, [artworkId]);

  React.useEffect(() => {
    if (!arLink) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    import("qrcode").then((QRCode) =>
      QRCode.toDataURL(arLink, { width: 220, margin: 1 }).then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [arLink]);

  return { arLink, qrDataUrl };
}
