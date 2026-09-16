"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/client/hooks";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Gates artist-only areas (exhibitions, analytics, orders, new listing)
 * behind the artist's own profile verification, not just their role — an
 * artist can only update their account info until an admin verifies them.
 * A no-op for admins (they have their own, unrestricted path into these
 * pages) and for a still-loading auth state, which RequireRole already
 * handles before this ever renders.
 */
export function RequireVerifiedArtist({ children }: { children: React.ReactNode }) {
  const { currentUser, currentArtist } = useAuth();

  if (currentUser?.role === "artist" && currentArtist?.verificationStatus !== "verified") {
    return (
      <EmptyState
        icon={Lock}
        title="Your profile isn't verified yet"
        description="An admin needs to verify your artist profile before you can use this area. You can still update your account info in the meantime."
        action={
          <Button asChild variant="outline">
            <Link href="/artist">Back to dashboard</Link>
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
