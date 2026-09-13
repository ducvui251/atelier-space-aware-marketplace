/**
 * Mirrors next.config.ts `images.remotePatterns`. next/image throws (a
 * server-side 500 during SSR, not a broken <img>) on any host it isn't
 * configured for, so anything that feeds a *data-sourced* URL into
 * ArtworkImage/next/image should gate it here first and fall back to the
 * "No image" placeholder. The mock dataset still contains artworks with
 * example.com / wikipedia page URLs, which is exactly the case this guards.
 */
const DISPLAYABLE_HOSTS = ["images.unsplash.com", "openaccess-cdn.clevelandart.org"];

export function isDisplayableImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/img/")) return true;
  try {
    const { hostname } = new URL(url);
    return DISPLAYABLE_HOSTS.includes(hostname) || hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

/** The URL if next/image can serve it, otherwise "" (ArtworkImage's placeholder case). */
export function displayableImageUrl(url: string | undefined | null): string {
  return url && isDisplayableImageUrl(url) ? url : "";
}
