import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { OpenCollectionBrowser } from "@/components/discovery/OpenCollectionBrowser";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public-domain art references",
  description: "Browse public-domain artwork references from the Cleveland Museum of Art Open Access collection.",
};

interface ReferencePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PublicDomainReferencePage({ searchParams }: ReferencePageProps) {
  const params = await searchParams;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(rawPage ?? 1);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 && parsedPage <= 10_000 ? parsedPage : 1;

  return (
    <PageContainer className="py-10">
      <Link href="/artworks" className="text-body-sm text-muted-foreground underline underline-offset-4">
        Back to Atelier artworks
      </Link>
      <div className="mt-6 max-w-3xl">
        <p className="eyebrow">Cleveland Museum of Art · Open Access</p>
        <h1 className="mt-2 font-display text-h1 text-foreground">Public-domain artworks</h1>
        <p className="mt-3 text-body text-muted-foreground">
          These museum works are for discovery and visual reference. They are not Atelier listings, are not for sale here, and have not been reviewed by Atelier.
        </p>
        <p className="mt-2 text-caption text-subdued">
          CC0 artworks from the Cleveland Museum of Art Open Access collection.
        </p>
      </div>
      <div className="mt-8">
        <OpenCollectionBrowser page={page} />
      </div>
    </PageContainer>
  );
}
