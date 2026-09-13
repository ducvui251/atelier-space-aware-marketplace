"use client";

import Link from "next/link";
import { ArrowUpRight, Plus, RefreshCw } from "lucide-react";
import type { Exhibition } from "@atelier/contracts";
import { useApiResource } from "@/lib/client/hooks";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

function statusClass(status: Exhibition["status"]) {
  if (status === "published") return "border-success/30 bg-success-soft text-success-foreground";
  if (status === "archived") return "border-border bg-muted text-muted-foreground";
  return "border-warning/30 bg-warning-soft text-warning-foreground";
}

export function ExhibitionManager() {
  const { data, loading, error, refresh } = useApiResource<{ items: Exhibition[]; total: number }>("/api/exhibitions");
  const exhibitions = data?.items ?? [];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Exhibitions</p>
          <h1 className="mt-2 font-display text-h2 text-foreground">Your exhibitions</h1>
          <p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">Arrange artwork in a gallery, then publish a link to share it.</p>
        </div>
        <Button asChild>
          <Link href="/exhibitions/manage/new"><Plus className="size-4" /> New exhibition</Link>
        </Button>
      </div>

      {error ? (
        <div className="mt-6 flex flex-col gap-3 rounded-md border border-destructive bg-destructive-soft px-4 py-3 text-body-sm text-destructive-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Couldn&apos;t load exhibitions: {error}</span>
          <Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="size-3.5" /> Retry</Button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[0, 1].map((key) => <Skeleton key={key} className="h-36 rounded-lg" />)}
        </div>
      ) : exhibitions.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {exhibitions.map((exhibition) => (
            <article key={exhibition.id} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-h3 text-foreground">{exhibition.title}</h2>
                  <p className="mt-1 truncate text-caption text-muted-foreground">/exhibitions/{exhibition.slug}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-caption capitalize ${statusClass(exhibition.status)}`}>
                  {exhibition.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <p className="text-caption text-muted-foreground">{exhibition.artworkCount} {exhibition.artworkCount === 1 ? "artwork" : "artworks"}</p>
                <div className="flex gap-2">
                  {exhibition.status === "published" ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/exhibitions/${exhibition.slug}`} target="_blank"><ArrowUpRight className="size-3.5" /> View</Link>
                    </Button>
                  ) : null}
                  <Button asChild size="sm" variant="outline"><Link href={`/exhibitions/manage/${exhibition.id}`}>Edit</Link></Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : !error ? (
        <div className="mt-10">
          <EmptyState
            title="No exhibitions yet"
            description="Create one, add your artwork, and arrange it in the gallery."
            action={<Button asChild><Link href="/exhibitions/manage/new"><Plus className="size-4" /> Create an exhibition</Link></Button>}
          />
        </div>
      ) : null}
    </>
  );
}
