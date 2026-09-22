"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useArtworkArQr } from "@/lib/ar/use-artwork-ar-qr";

/**
 * Desktop entry point for "View in AR": a plain QR-code modal, no inline 3D
 * preview — matching Artfinder's own ArtPlacer-powered flow (scanned live
 * on artfinder.com while researching this feature). Scanning it lands on
 * this same artwork page with ?ar=1, which auto-opens ArtworkArViewer's
 * inline panel — the actual camera-AR experience, already verified on a
 * real phone. This modal never mounts <model-viewer> itself, since its only
 * job on desktop is showing a link out to a phone.
 */
export function ArtworkArQrModal({ artworkId, title, open, onOpenChange }: { artworkId: string; title: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { arLink, qrDataUrl } = useArtworkArQr(artworkId);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(90vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 text-center shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
          <DialogPrimitive.Close className="focus-ring absolute right-3 top-3 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <DialogPrimitive.Title className="text-h3 font-medium text-foreground">
            Open on your phone or another AR-compatible device
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-body-sm text-muted-foreground">
            Scan this code to view {title} in AR
          </DialogPrimitive.Description>

          <div className="mt-5 flex justify-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a locally generated QR data: URI, not a remote/optimizable image
              <img src={qrDataUrl} alt={`Scan to view ${title} in AR on your phone`} width={220} height={220} className="rounded-md border border-border" />
            ) : arLink === null ? (
              <p className="max-w-xs text-caption text-muted-foreground">
                No phone-reachable link is configured yet. Set <code className="rounded bg-muted px-1">AR_PHONE_ORIGIN</code> in{" "}
                <code className="rounded bg-muted px-1">.env</code> to your PC&apos;s LAN IP (find it with <code className="rounded bg-muted px-1">ipconfig</code>),
                then restart <code className="rounded bg-muted px-1">web-gateway</code>.
              </p>
            ) : (
              <div className="grid size-[220px] place-items-center text-caption text-muted-foreground">Generating QR code…</div>
            )}
          </div>

          <p className="mt-4 text-caption text-muted-foreground">Already on your phone? Open this page in Chrome or Safari.</p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
