/**
 * Mirrors next.config.ts `images.remotePatterns`. next/image throws (a
 * server-side 500 during SSR, not a broken <img>) on any host it isn't
 * configured for, so anything that feeds a *data-sourced* URL into
 * ArtworkImage/next/image should gate it here first and fall back to the
 * "No image" placeholder. The mock dataset still contains artworks with
 * example.com / wikipedia page URLs, which is exactly the case this guards.
 */
const DISPLAYABLE_HOSTS = ["images.unsplash.com", "openaccess-cdn.clevelandart.org", "images.metmuseum.org"];

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

// Must be one of next/image's configured `deviceSizes` (the defaults, since
// next.config.ts doesn't override them) or the optimizer rejects the request.
// A room with several placed artworks keeps every one of their textures
// resident in GPU memory at once (three.js doesn't unmount off-screen
// meshes, only skips drawing them), so this was reported as visibly janky
// camera rotation with 4-7 artworks in one room at the previous 1080 —
// 768 is still sharp at the distances artwork is actually viewed from.
const TEXTURE_WIDTH = 768;

/**
 * Same-origin URL for loading an artwork image as a WebGL texture, or
 * undefined when the host isn't servable (the 3D scene then renders a plain
 * colour panel instead of firing a request that can only fail).
 *
 * The 3D scene can't load the CDN URL directly the way an <img> can: WebGL
 * textures are tainted-canvas territory, so the browser requires a CORS
 * `Access-Control-Allow-Origin` header on the image response — and the
 * museum CDNs the catalog is sourced from don't reliably send one (Cleveland
 * never does; the Met sends it on HEAD but not on the actual GET). Routing
 * through next/image's optimizer makes the request same-origin, which needs
 * no CORS at all, and reuses the host allowlist above.
 */
export function textureImageUrl(url: string | undefined | null): string | undefined {
  if (!url || !isDisplayableImageUrl(url)) return undefined;
  if (url.startsWith("/")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${TEXTURE_WIDTH}&q=80`;
}
