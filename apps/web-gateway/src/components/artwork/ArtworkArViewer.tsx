"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * True camera AR, not the flat 2D "view in your room" placement (RoomPlaceholder):
 * this loads a real-scale textured quad (/api/artworks/[id]/model.gltf) into
 * <model-viewer>, whose built-in AR button launches Scene Viewer on Android
 * or Quick Look on iOS — the same phone-camera placement pattern Artfinder's
 * ArtPlacer-powered "View In Room" uses. <model-viewer> registers itself as a
 * custom element on import, which touches the DOM, so it's loaded dynamically
 * client-side only rather than at module scope (SSR has no DOM to touch).
 */
export function ArtworkArViewer({ artworkId, title, onClose }: { artworkId: string; title: string; onClose: () => void }) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    import("@google/model-viewer").then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <p className="border-t border-border bg-surface px-4 py-2.5 text-caption text-muted-foreground">
        On a phone: tap the AR icon in the viewer to place {title} on your own wall, true to scale.
        On desktop, drag to look around the model — real AR needs a phone camera.
      </p>
    </div>
  );
}
