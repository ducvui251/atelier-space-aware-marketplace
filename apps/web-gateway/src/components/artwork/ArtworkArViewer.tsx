"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useArtworkArQr } from "@/lib/ar/use-artwork-ar-qr";

/**
 * True camera AR, not the flat 2D "view in your room" placement (RoomPlaceholder):
 * this loads a real-scale textured quad (/api/artworks/[id]/model.gltf) into
 * <model-viewer>, whose built-in AR button launches Scene Viewer on Android
 * or Quick Look on iOS — the same phone-camera placement pattern Artfinder's
 * ArtPlacer-powered "View In Room" uses. <model-viewer> registers itself as a
 * custom element on import, which touches the DOM, so it's loaded dynamically
 * client-side only rather than at module scope (SSR has no DOM to touch).
 *
 * Only reached by scanning the QR code shown in ArtworkArQrModal (this page
 * with ?ar=1) — i.e. it's expected to already be running on an AR-capable
 * phone. The `canActivateAR === false` branch below is just a defensive
 * fallback (someone opens a ?ar=1 link directly on a desktop, a bookmark
 * gets shared, etc.), not the primary desktop entry point anymore.
 */
export function ArtworkArViewer({ artworkId, title, onClose }: { artworkId: string; title: string; onClose: () => void }) {
  const [ready, setReady] = React.useState(false);
  const [canActivateAR, setCanActivateAR] = React.useState<boolean | null>(null);
  const modelRef = React.useRef<HTMLElement | null>(null);
  const { arLink, qrDataUrl } = useArtworkArQr(artworkId);

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
              No phone-reachable link is configured. Set <code className="rounded bg-muted px-1">AR_PHONE_ORIGIN</code> in{" "}
              <code className="rounded bg-muted px-1">.env</code>, then restart <code className="rounded bg-muted px-1">web-gateway</code>.
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
