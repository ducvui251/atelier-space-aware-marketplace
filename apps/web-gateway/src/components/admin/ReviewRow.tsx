"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { Input } from "@/components/ui/input";

export function ReviewRow({
  title,
  subtitle,
  imageUrl,
  onApprove,
  onReject,
}: {
  title: string;
  subtitle: string;
  imageUrl: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
        <ArtworkImage src={imageUrl} alt={title} fill sizes="64px" className="object-cover" />
      </div>
      <div className="min-w-[180px] flex-1">
        <p className="text-body font-medium text-foreground">{title}</p>
        <p className="text-caption text-muted-foreground">{subtitle}</p>
      </div>
      {rejecting ? (
        <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason"
            className="h-9 flex-1"
          />
          <Button size="sm" variant="outline" disabled={!reason.trim()} onClick={() => onReject(reason.trim())}>
            Confirm reject
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" onClick={onApprove}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
