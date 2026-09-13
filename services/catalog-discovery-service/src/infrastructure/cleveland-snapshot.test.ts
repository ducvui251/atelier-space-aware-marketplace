import assert from "node:assert/strict";
import { test } from "node:test";
import { listPublicDomainArtworks } from "./cleveland-snapshot.ts";

test("serves a page from the committed snapshot and reports the imported count", async () => {
  const page = await listPublicDomainArtworks({ page: 1, limit: 24 });

  assert.equal(page.total, 48);
  assert.equal(page.totalPages, 2);
  assert.equal(page.items.length, 24);
  assert.equal(page.hasPreviousPage, false);
  assert.equal(page.hasNextPage, true);
  assert.ok(page.items.every((item) => /^\/img\/cma-open-access\/\d+_web\.jpg$/.test(item.imageUrl)));
  assert.ok(page.items.every((item) => item.imageFullUrl === item.imageUrl));
});

test("serves the second local page without claiming there are more museum records", async () => {
  const page = await listPublicDomainArtworks({ page: 2, limit: 24 });

  assert.equal(page.total, 48);
  assert.equal(page.items.length, 24);
  assert.equal(page.hasPreviousPage, true);
  assert.equal(page.hasNextPage, false);
});

test("returns an empty page past the imported snapshot", async () => {
  const page = await listPublicDomainArtworks({ page: 3, limit: 24 });

  assert.equal(page.items.length, 0);
  assert.equal(page.total, 48);
  assert.equal(page.totalPages, 2);
  assert.equal(page.hasPreviousPage, true);
  assert.equal(page.hasNextPage, false);
});
