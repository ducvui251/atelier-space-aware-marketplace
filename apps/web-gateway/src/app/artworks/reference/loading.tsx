import { PageContainer } from "@/components/layout/PageContainer";

export default function PublicDomainReferenceLoading() {
  return (
    <PageContainer className="py-10">
      <div aria-live="polite" className="eyebrow">Loading public-domain artworks…</div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-[4/5] rounded-lg bg-muted" />
            <div className="mt-4 h-4 w-3/4 rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
