"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useAppState } from "@/lib/store/hooks";
import { artworksForArtist } from "@/lib/store/hooks";

function verificationVariant(status: string) {
  if (status === "verified") return "success" as const;
  if (status === "rejected") return "destructive" as const;
  return "warning" as const;
}

function ArtistDashboard() {
  const { currentArtist, db } = useAppState();
  if (!currentArtist) return null;
  const listings = artworksForArtist(db, currentArtist.id);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Artist dashboard</p>
          <h1 className="mt-2 font-display text-h2 text-foreground">{currentArtist.displayName}</h1>
          <Badge variant={verificationVariant(currentArtist.verificationStatus)} className="mt-2 capitalize">
            {currentArtist.verificationStatus}
          </Badge>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/artist/orders">Đơn hàng</Link>
          </Button>
          <Button asChild>
            <Link href="/artist/artworks/new">+ New listing</Link>
          </Button>
        </div>
      </div>

      <div className="mt-10 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-body-sm">
          <thead className="bg-muted text-caption text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Availability</th>
              <th className="px-4 py-3 text-left">Verification</th>
              <th className="px-4 py-3 text-left" />
            </tr>
          </thead>
          <tbody>
            {listings.map((artwork) => (
              <tr key={artwork.id} className="border-t border-border align-top">
                <td className="px-4 py-3 text-foreground">{artwork.title}</td>
                <td className="px-4 py-3">{formatPrice(artwork.price, artwork.currency)}</td>
                <td className="px-4 py-3 capitalize">{artwork.availability}</td>
                <td className="px-4 py-3">
                  <Badge variant={verificationVariant(artwork.verificationStatus)} className="capitalize">
                    {artwork.verificationStatus}
                  </Badge>
                  {artwork.verificationNote ? (
                    <p className="mt-1 max-w-xs text-caption text-muted-foreground">
                      {artwork.verificationNote}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/artist/artworks/${artwork.id}/edit`}
                    className="focus-ring text-caption underline underline-offset-2 hover:text-foreground"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {listings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-body-sm text-muted-foreground">
                  Chưa có tác phẩm nào. Tạo listing đầu tiên của bạn.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ArtistPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role="artist">
        <ArtistDashboard />
      </RequireRole>
    </PageContainer>
  );
}
