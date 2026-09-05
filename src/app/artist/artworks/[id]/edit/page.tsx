"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { ArtworkForm } from "@/components/artwork/ArtworkForm";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PackageSearch } from "lucide-react";
import { useAppState } from "@/lib/store/hooks";

function EditArtworkView() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { db, currentArtist, updateArtwork } = useAppState();
  const artwork = db.artworks.find((a) => a.id === params.id && a.artistId === currentArtist?.id);

  if (!artwork) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Không tìm thấy tác phẩm"
        description="Tác phẩm này không tồn tại hoặc không thuộc về bạn."
        action={
          <Button asChild variant="outline">
            <Link href="/artist">Quay lại dashboard</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <p className="eyebrow">Artist dashboard</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">Edit listing</h1>
      <p className="mt-3 max-w-xl text-body text-muted-foreground">
        Chỉnh sửa metadata sẽ đưa tác phẩm trở lại trạng thái <strong>pending</strong> để duyệt lại.
      </p>

      <div className="mt-8">
        <ArtworkForm
          initial={artwork}
          submitLabel="Lưu thay đổi"
          onSubmit={(input) => updateArtwork(artwork.id, input)}
          onSuccess={() => router.push("/artist")}
        />
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
