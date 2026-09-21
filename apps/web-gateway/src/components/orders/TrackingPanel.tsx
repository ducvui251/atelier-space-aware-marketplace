"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { ShipmentTracking } from "@/types";

/**
 * Live status from Shippo's own tracking database — distinct from the
 * external "Track"/"Track shipment" link, which just opens the carrier's
 * public tracking page. Under a test Shippo token this will usually come
 * back unavailable (test-purchased labels get realistic-looking tracking
 * numbers Shippo itself doesn't recognize), which is expected and shown as
 * a plain message rather than an error.
 */
export function TrackingPanel({ fetchUrl, hasTrackingLink = false }: { fetchUrl: string; hasTrackingLink?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [tracking, setTracking] = React.useState<ShipmentTracking | null>(null);
  const [unavailable, setUnavailable] = React.useState(false);

  async function load() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (tracking || unavailable) return;
    setLoading(true);
    try {
      setTracking(await apiFetch<ShipmentTracking>(fetchUrl));
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size="sm" variant="ghost" className="h-auto px-0 text-caption underline underline-offset-2" onClick={load}>
        {open ? "Hide tracking status" : "View tracking status"}
      </Button>
      {open ? (
        <div className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-caption text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" /> Checking live status…
            </span>
          ) : unavailable ? (
            <span>
              Live status isn&apos;t available yet for this shipment.
              {hasTrackingLink ? " Use the tracking link above once the carrier picks it up." : ""}
            </span>
          ) : tracking ? (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-foreground">
                {tracking.statusDetails} <span className="capitalize text-muted-foreground">({tracking.status.toLowerCase().replace("_", " ")})</span>
              </p>
              {tracking.history.length > 0 ? (
                <ol className="flex flex-col gap-1 border-l border-border pl-3">
                  {[...tracking.history].reverse().map((event, index) => (
                    <li key={index}>
                      <span className="text-foreground">{event.statusDetails}</span>
                      {" — "}
                      {new Date(event.statusDate).toLocaleString("en-US")}
                      {event.location?.city ? ` · ${event.location.city}${event.location.state ? `, ${event.location.state}` : ""}` : ""}
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
