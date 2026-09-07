"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiResource } from "@/lib/client/hooks";
import { apiFetch } from "@/lib/client/api";
import type { Complaint } from "@/types";

function ComplaintRow({ complaint, onChanged }: { complaint: Complaint; onChanged: () => void }) {
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function resolve(status: "resolved" | "rejected") {
    setSubmitting(true);
    try {
      await apiFetch(`/api/admin/complaints/${encodeURIComponent(complaint.id)}/resolve`, {
        method: "POST",
        body: JSON.stringify({ status, note: note.trim() || undefined }),
      });
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body font-medium text-foreground">Đơn {complaint.orderId}</p>
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
          <Button size="sm" disabled={submitting} onClick={() => resolve("resolved")}>
            Đánh dấu đã xử lý
          </Button>
          <Button size="sm" variant="outline" disabled={submitting} onClick={() => resolve("rejected")}>
            Từ chối
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ComplaintsQueue() {
  const { data, loading, error, refresh } = useApiResource<{ items: Complaint[]; total: number }>("/api/admin/complaints");
  const complaints = data?.items ?? [];

  return (
    <>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Khiếu nại</h1>

      <div className="mt-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertTriangle}
            title="Không thể tải khiếu nại"
            description={error}
            action={
              <Button variant="outline" onClick={refresh}>
                Thử lại
              </Button>
            }
          />
        ) : complaints.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Không có khiếu nại" description="Khiếu nại từ người mua sẽ hiện ở đây." />
        ) : (
          <div className="flex flex-col gap-4">
            {complaints.map((complaint) => (
              <ComplaintRow key={complaint.id} complaint={complaint} onChanged={refresh} />
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
