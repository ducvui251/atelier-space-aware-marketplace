"use client";

import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { ArtworkForm } from "@/components/artwork/ArtworkForm";
import { useAppState } from "@/lib/store/hooks";

function NewArtworkView() {
  const router = useRouter();
  const { createArtwork } = useAppState();

  return (
    <>
      <p className="eyebrow">Artist dashboard</p>
      <h1 className="mt-2 font-display text-h2 text-foreground">New listing</h1>
      <p className="mt-3 max-w-xl text-body text-muted-foreground">
        Tác phẩm sẽ ở trạng thái <strong>pending</strong> cho tới khi quản trị viên duyệt.
      </p>

      <div className="mt-8">
        <ArtworkForm
          submitLabel="Tạo listing"
          onSubmit={(input) => createArtwork(input)}
          onSuccess={() => router.push("/artist")}
        />
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
