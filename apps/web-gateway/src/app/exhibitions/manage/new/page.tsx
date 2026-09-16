import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateExhibitionForm } from "@/components/exhibitions/CreateExhibitionForm";
import { RequireRole } from "@/components/auth/RequireRole";
import { RequireVerifiedArtist } from "@/components/auth/RequireVerifiedArtist";
import { PageContainer } from "@/components/layout/PageContainer";

export default function NewExhibitionPage() {
  return (
    <PageContainer className="py-12">
      <RequireRole role={["artist", "admin"]}>
        <RequireVerifiedArtist>
          <div className="mb-6">
            <Link href="/exhibitions/manage" className="focus-ring inline-flex items-center gap-2 text-caption text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All exhibitions</Link>
            <p className="eyebrow mt-6">Exhibitions</p>
            <h1 className="mt-2 font-display text-h2 text-foreground">Create an exhibition</h1>
            <p className="mt-2 text-body-sm text-muted-foreground">Choose a gallery style, then add and arrange artwork after creating the draft.</p>
          </div>
          <CreateExhibitionForm />
        </RequireVerifiedArtist>
      </RequireRole>
    </PageContainer>
  );
}
