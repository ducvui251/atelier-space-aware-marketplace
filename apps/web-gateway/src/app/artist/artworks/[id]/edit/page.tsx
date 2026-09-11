"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { ArtworkForm, type ArtworkFormInput } from "@/components/artwork/ArtworkForm";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PackageSearch } from "lucide-react";
import { useAuth, useApiResource } from "@/lib/client/hooks";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { Artwork } from "@/types";

function EditArtworkView() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { currentArtist } = useAuth();
  const { data: artwork, loading } = useApiResource<Artwork>(`/api/artist/artworks/${encodeURIComponent(params.id)}`);

  if (loading) return null;

  if (!artwork || artwork.artistId !== currentArtist?.id) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Artwork not found"
        description="This artwork doesn't exist or doesn't belong to you."
        action={
          <Button asChild variant="outline">
            <Link href="/artist">Back to dashboard</Link>
          </Button>
        }
      />
    );
  }

  async function onSubmit(input: ArtworkFormInput) {
    try {
      await apiFetch<Artwork>(`/api/artist/artworks/${encodeURIComponent(params.id)}`, { method: "PATCH", body: JSON.stringify(input) });
      return { success: true as const };
    } catch (error) {
      return { error: error instanceof ApiError ? error.message : "Couldn't save changes." };
    }
  }

  return (
    <>
      <p className="eyebrow">Artist dashboard</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Edit listing</h1>
      <p className="mt-3 max-w-xl text-body text-muted-foreground">
        Editing this artwork&apos;s details resets it to <strong>pending</strong> for re-review.
      </p>

      <div className="mt-8">
        <ArtworkForm initial={artwork} submitLabel="Save changes" onSubmit={onSubmit} onSuccess={() => router.push("/artist")} />
      </div>
    </>
  );
}

export default function EditArtworkPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="artist">
        <EditArtworkView />
      </RequireRole>
    </PageContainer>
  );
}
