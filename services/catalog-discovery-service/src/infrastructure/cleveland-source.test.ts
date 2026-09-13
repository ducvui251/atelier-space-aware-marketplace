import assert from "node:assert/strict";
import { test } from "node:test";
import { ClevelandMuseumUpstreamError, fetchPublicDomainArtworkPage } from "./cleveland-source.ts";

function artwork(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    share_license_status: "CC0",
    title: "Evening Study",
    creation_date: "1901",
    creators: [{ role: "artist", description: "Artist Example (1901–1980)" }],
    technique: "Oil on canvas",
    measurements: "20 × 30 cm",
    images: {
      web: { url: "https://openaccess-cdn.clevelandart.org/12/12_web.jpg" },
      print: { url: "https://openaccess-cdn.clevelandart.org/12/12_print.jpg" },
    },
    url: "https://clevelandart.org/art/12",
    ...overrides,
  };
}

function response(overrides: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({
    info: { total: 6, parameters: { skip: "2", limit: "2" } },
    data: [artwork()],
    ...overrides,
  }), { status: 200, headers: { "content-type": "application/json" } });
}

test("requests the requested offset page and maps direct CC0 image URLs", async () => {
  let requestedUrl: URL | undefined;
  const page = await fetchPublicDomainArtworkPage({ page: 2, limit: 2 }, async (input) => {
    requestedUrl = new URL(String(input));
    return response();
  });

  assert.equal(requestedUrl?.origin, "https://openaccess-api.clevelandart.org");
  assert.equal(requestedUrl?.searchParams.get("cc0"), "");
  assert.equal(requestedUrl?.searchParams.get("has_image"), "1");
  assert.equal(requestedUrl?.searchParams.get("skip"), "2");
  assert.equal(requestedUrl?.searchParams.get("limit"), "2");
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0]?.imageUrl, "https://openaccess-cdn.clevelandart.org/12/12_web.jpg");
  assert.equal(page.items[0]?.imageFullUrl, "https://openaccess-cdn.clevelandart.org/12/12_print.jpg");
  assert.equal(page.items[0]?.artistName, "Artist Example (1901–1980)");
  assert.equal(page.items[0]?.imageAltText, "Evening Study");
  assert.equal(page.items[0]?.sourceUrl, "https://clevelandart.org/art/12");
  assert.equal(page.hasPreviousPage, true);
  assert.equal(page.hasNextPage, true);
  assert.equal(page.total, 6);
});

test("maps rate limiting to a retryable unavailable response without retrying inline", async () => {
  let requestCount = 0;
  await assert.rejects(
    fetchPublicDomainArtworkPage({ page: 1, limit: 24 }, async () => {
      requestCount += 1;
      return new Response("rate limited", { status: 429 });
    }),
    (error: unknown) => error instanceof ClevelandMuseumUpstreamError && error.status === 503 && error.retryable,
  );
  assert.equal(requestCount, 1);
});

test("rejects image URLs outside the Cleveland Museum image CDN", async () => {
  await assert.rejects(
    fetchPublicDomainArtworkPage({ page: 1, limit: 24 }, async () => response({
      data: [artwork({
        images: { web: { url: "https://example.com/image.jpg" }, print: null },
      })],
    })),
    (error: unknown) => error instanceof ClevelandMuseumUpstreamError && error.code === "UPSTREAM_INVALID_RESPONSE",
  );
});

test("rejects records outside the CC0 license filter", async () => {
  await assert.rejects(
    fetchPublicDomainArtworkPage({ page: 1, limit: 24 }, async () => response({
      data: [artwork({ share_license_status: "Copyrighted" })],
    })),
    (error: unknown) => error instanceof ClevelandMuseumUpstreamError && error.code === "UPSTREAM_INVALID_RESPONSE",
  );
});

test("uses the web image when a print-sized image is unavailable", async () => {
  const page = await fetchPublicDomainArtworkPage({ page: 1, limit: 24 }, async () => response({
    data: [artwork({ images: { web: { url: "https://openaccess-cdn.clevelandart.org/12/12_web.jpg" }, print: null } })],
  }));
  assert.equal(page.items[0]?.imageFullUrl, page.items[0]?.imageUrl);
});
