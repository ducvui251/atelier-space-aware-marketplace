"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppState } from "@/lib/store/hooks";
import type { Complaint } from "@/types";

function ComplaintRow({ complaint }: { complaint: Complaint }) {
  const { db, resolveComplaint } = useAppState();
  const order = db.orders.find((o) => o.id === complaint.orderId);
  const artwork = order ? db.artworks.find((a) => a.id === order.artworkId) : undefined;
  const [note, setNote] = React.useState("");

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body font-medium text-foreground">
            {artwork?.title ?? complaint.orderId}
          </p>
          <p className="text-caption text-muted-foreground">Đơn {complaint.orderId}</p>
        </div>
        <Badge variant={complaint.status === "open" ? "warning" : complaint.status === "resolved" ? "success" : "destructive"} className="capitalize">
          {complaint.status}
        </Badge>
      </div>
      <p className="mt-3 text-body-sm text-foreground">{complaint.reason}</p>
      {complaint.resolutionNote ? (
        <p className="mt-2 text-caption text-muted-foreground">Ghi chú xử lý: {complaint.resolutionNote}</p>
      ) : null}

      {complaint.status === "open" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú xử lý"
            className="h-9 max-w-xs flex-1"
          />
          <Button size="sm" onClick={() => resolveComplaint(complaint.id, "resolved", note.trim() || undefined)}>
            Đánh dấu đã xử lý
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => resolveComplaint(complaint.id, "rejected", note.trim() || undefined)}
          >
            Từ chối
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ComplaintsQueue() {
  const { db } = useAppState();
  const complaints = [...db.complaints].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "open" ? -1 : 1;
  });

  return (
    <>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Khiếu nại</h1>

      <div className="mt-8">
        {complaints.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Không có khiếu nại" description="Khiếu nại từ người mua sẽ hiện ở đây." />
        ) : (
          <div className="flex flex-col gap-4">
            {complaints.map((complaint) => (
              <ComplaintRow key={complaint.id} complaint={complaint} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminComplaintsPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="admin">
        <ComplaintsQueue />
      </RequireRole>
    </PageContainer>
  );
}
