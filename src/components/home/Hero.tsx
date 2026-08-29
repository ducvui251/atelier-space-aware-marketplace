import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getArtworks } from "@/features/artworks/services/artwork.service";

export async function Hero() {
  const heroArtwork = (await getArtworks())[1];

  return (
    <section className="container-page pt-8 md:pt-14">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="max-w-2xl">
          <p className="eyebrow">Curated art, chosen for your space</p>
          <h1 className="mt-5 font-display text-display text-foreground text-balance">
            Find art that belongs in your space.
          </h1>
          <p className="mt-6 max-w-xl text-body-lg text-muted-foreground text-balance">
            Discover original and limited-edition works selected around your
            taste, space, and budget.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/artworks">
                Explore artworks
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/rooms">View in a room</Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted sm:aspect-[5/6]">
            <Image
              src={heroArtwork.imageUrl}
              alt={heroArtwork.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -left-4 bottom-6 hidden rounded-lg border border-border bg-surface px-4 py-3 shadow-sm sm:block">
            <p className="text-caption text-muted-foreground">{heroArtwork.artist}</p>
            <p className="font-display text-h3 text-foreground">{heroArtwork.title}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
