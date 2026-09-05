import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { SavedView } from "@/components/saved/SavedView";

export const metadata: Metadata = {
  title: "Saved",
  description: "Artworks you have saved for later.",
};

export default function SavedPage() {
  return (
    <PageContainer className="py-10">
      <RequireRole role={["buyer", "artist", "admin"]}>
        <SavedView />
      </RequireRole>
    </PageContainer>
  );
}
