"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client/api";

/**
 * True camera AR, not the flat 2D "view in your room" placement (RoomPlaceholder):
 * this loads a real-scale textured quad (/api/artworks/[id]/model.gltf) into
 * <model-viewer>, whose built-in AR button launches Scene Viewer on Android
 * or Quick Look on iOS — the same phone-camera placement pattern Artfinder's
 * ArtPlacer-powered "View In Room" uses. <model-viewer> registers itself as a
 * custom element on import, which touches the DOM, so it's loaded dynamically
 * client-side only rather than at module scope (SSR has no DOM to touch).
 *
 * On desktop, the browser itself usually can't launch AR — the buyer needs
 * to continue on their phone, so (same as Artfinder's ArtPlacer widget) this
 * fetches a phone-reachable link to this same page and renders it as a QR
 * code to scan. `resolvePhoneReachableOrigin` in the API route returns null
 * when AR_PHONE_ORIGIN isn't set, in which case there's no reachable link
 * to encode — the setup hint below explains what to set.
 */
export function ArtworkArViewer({ artworkId, title, onClose }: { artworkId: string; title: string; onClose: () => void }) {
  const [ready, setReady] = React.useState(false);
  const [canActivateAR, setCanActivateAR] = React.useState<boolean | null>(null);
  const [arLink, setArLink] = React.useState<string | null | undefined>(undefined);
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null);
  const modelRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer").then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    apiFetch<{ url: string | null }>(`/api/artworks/${encodeURIComponent(artworkId)}/ar-link`)
      .then((result) => setArLink(result.url))
      .catch(() => setArLink(null));
  }, [artworkId]);

  React.useEffect(() => {
    const el = modelRef.current;
    if (!ready || !el) return;
    const updateArState = () => setCanActivateAR(Boolean((el as unknown as { canActivateAR?: boolean }).canActivateAR));
    // model-viewer's `load` can fire before this effect's listener attaches
    // (the element mounts as soon as `ready` flips true, and a cached/fast
    // model can finish loading in the same tick) — check the property
    // directly here too, not just future events, so a load that already
    // happened isn't missed.
    updateArState();
    el.addEventListener("load", updateArState);
    el.addEventListener("ar-status", updateArState);
    return () => {
      el.removeEventListener("load", updateArState);
      el.removeEventListener("ar-status", updateArState);
    };
  }, [ready]);

  // Only render a QR to scan when this device itself can't launch AR
  // (matches Artfinder: the QR modal is a desktop-only fallback) and once
  // there's an actual phone-reachable link to encode.
  React.useEffect(() => {
    if (canActivateAR !== false || !arLink) {
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
  }, [canActivateAR, arLink]);

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <p className="text-body-sm font-medium text-foreground">View in AR</p>
        <Button size="icon" variant="ghost" aria-label="Close AR view" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      {ready ? (
        <model-viewer
          ref={modelRef as React.RefObject<HTMLElement>}
          src={`/api/artworks/${encodeURIComponent(artworkId)}/model.gltf`}
          alt={title}
          ar
          ar-modes="scene-viewer webxr quick-look"
          camera-controls
          reveal="auto"
          style={{ width: "100%", height: "380px", display: "block" }}
        />
      ) : (
        <div className="grid h-[380px] place-items-center text-body-sm text-muted-foreground">Loading AR viewer…</div>
      )}

      {canActivateAR === false ? (
        <div className="flex flex-col items-center gap-3 border-t border-border bg-surface px-4 py-5 text-center">
          {qrDataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- a locally generated QR data: URI, not a remote/optimizable image */}
              <img src={qrDataUrl} alt="Scan to view in AR on your phone" width={220} height={220} className="rounded-md border border-border bg-white p-2" />
              <p className="max-w-xs text-caption text-muted-foreground">
                Scan with your phone, then tap the AR icon to place {title} on your own wall, true to scale.
              </p>
            </>
          ) : arLink === null ? (
            <p className="max-w-sm text-caption text-muted-foreground">
              No phone-reachable link is configured yet. Set <code className="rounded bg-muted px-1">AR_PHONE_ORIGIN</code> in{" "}
              <code className="rounded bg-muted px-1">.env</code> to your PC&apos;s LAN IP on the same Wi-Fi as your phone (e.g.{" "}
              <code className="rounded bg-muted px-1">http://192.168.1.23:3000</code>, find it with <code className="rounded bg-muted px-1">ipconfig</code>),
              then restart <code className="rounded bg-muted px-1">web-gateway</code> — a QR code to scan will appear here.
            </p>
          ) : (
            <p className="text-caption text-muted-foreground">Generating QR code…</p>
          )}
        </div>
      ) : (
        <p className="border-t border-border bg-surface px-4 py-2.5 text-caption text-muted-foreground">
          Tap the AR icon in the viewer to place {title} on your own wall, true to scale.
        </p>
      )}
    </div>
  );
}
