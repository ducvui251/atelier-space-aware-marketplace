import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ExhibitionDemoSceneLoader } from "@/components/spatial/ExhibitionDemoSceneLoader";

export const metadata: Metadata = {
  title: "3D Exhibition Spike",
  description: "Static gallery MVP for the walkable 3D exhibition renderer.",
};

export default function ExhibitionDemoPage() {
  return (
    <PageContainer className="py-10">
      <div>
        <p className="eyebrow">Static gallery MVP</p>
        <h1 className="mt-2 font-display text-h1 text-foreground">3D Exhibition Renderer</h1>
        <p className="mt-3 max-w-2xl text-body text-muted-foreground">
          Internal-only preview of a procedural gallery room with placeholder artwork frames. No
          navigation or real artwork data yet.
        </p>
      </div>
      <div className="mt-6">
        <ExhibitionDemoSceneLoader />
      </div>
    </PageContainer>
  );
}
