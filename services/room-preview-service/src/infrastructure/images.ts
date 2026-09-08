/**
 * Deterministic local placeholder imagery for room presets (ADR 0001 D7).
 * Paths are Gateway-relative and resolve against the static assets committed
 * under apps/web-gateway/public/img. Production room imagery comes from
 * Storage/CDN URLs, never from a remote placeholder service.
 */
export function artworkImage(seed: string, width: number, height: number): string {
  void width;
  void height;
  return `/img/${seed}.jpg`;
}
