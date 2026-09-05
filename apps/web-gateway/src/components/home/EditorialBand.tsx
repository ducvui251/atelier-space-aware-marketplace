import Image from "next/image";

export function EditorialBand() {
  return (
    <div className="grid items-center gap-8 overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-2">
      <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full">
        <Image
          src="https://picsum.photos/seed/editorial-1/1000/750"
          alt="A quiet studio scene"
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      <div className="p-8 lg:p-12">
        <p className="eyebrow">In practice</p>
        <h2 className="mt-4 font-display text-h2 text-foreground text-balance">
          Buying your first original is easier than it looks.
        </h2>
        <p className="mt-4 text-body text-muted-foreground">
          From verifying an artist to understanding a certificate of
          authenticity, our buyers’ guide walks you through a trusting purchase
          — without the jargon.
        </p>
        <p className="mt-8 font-display text-h3 text-foreground">
          — Elena, collector since 2023
        </p>
      </div>
    </div>
  );
}
