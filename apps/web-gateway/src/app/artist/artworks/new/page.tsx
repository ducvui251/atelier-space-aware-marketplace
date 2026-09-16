"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { ArtworkForm, type ArtworkFormInput } from "@/components/artwork/ArtworkForm";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/client/hooks";
import { apiFetch, ApiError } from "@/lib/client/api";
import type { Artwork } from "@/types";

function NewArtworkView() {
  const router = useRouter();
  const { currentArtist } = useAuth();

  async function onSubmit(input: ArtworkFormInput) {
    try {
      const artwork = await apiFetch<Artwork>("/api/artist/artworks", { method: "POST", body: JSON.stringify(input) });
      return { success: true as const, id: artwork.id };
    } catch (error) {
      return { error: error instanceof ApiError ? error.message : "Couldn't create the artwork." };
    }
  }

  if (!currentArtist) return null;

  if (currentArtist.verificationStatus !== "verified") {
    return (
      <EmptyState
        icon={Lock}
        title="Your profile isn't verified yet"
        description="An admin needs to verify your artist profile before you can list artwork."
        action={
          <Button asChild variant="outline">
            <Link href="/artist">Back to dashboard</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <p className="eyebrow">Artist dashboard</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">New listing</h1>
      <p className="mt-3 max-w-xl text-body text-muted-foreground">
        Your artwork will be <strong>pending</strong> until an admin reviews it.
      </p>

      <div className="mt-8">
        <ArtworkForm submitLabel="Create listing" onSubmit={onSubmit} onSuccess={() => router.push("/artist")} />
      </div>
    </>
  );
}

export default function NewArtworkPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="artist">
        <NewArtworkView />
      </RequireRole>
    </PageContainer>
  );
}
