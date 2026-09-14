import assert from "node:assert/strict";
import test from "node:test";
import { resolveCartArtworks } from "../src/application/checkout-cart.ts";
import { interpretReservationResponse } from "../src/application/reservation-response.ts";

const jsonResponse = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

test("accepts a reservation response with an id", async () => {
  assert.deepEqual(
    await interpretReservationResponse(jsonResponse({ id: "reservation-1" }, 201)),
    { kind: "reserved", reservationId: "reservation-1" },
  );
});

test("treats only an explicit inventory conflict as unavailable", async () => {
  assert.deepEqual(
    await interpretReservationResponse(jsonResponse({ code: "CONFLICT", error: "Artwork is no longer available" }, 409)),
    { kind: "unavailable" },
  );
  assert.deepEqual(
    await interpretReservationResponse(jsonResponse({ code: "INTERNAL_ERROR", error: "Internal service error" }, 409)),
    { kind: "dependency-failure", status: 409, reason: "upstream-response" },
  );
});

test("keeps reservation service failures out of the inventory-conflict path", async (t) => {
  for (const status of [400, 401, 403, 404, 500, 503]) {
    await t.test(`HTTP ${status}`, async () => {
      assert.deepEqual(
        await interpretReservationResponse(jsonResponse({ error: "service error" }, status)),
        { kind: "dependency-failure", status, reason: "upstream-response" },
      );
    });
  }
});

test("rejects successful responses without a reservation id", async () => {
  assert.deepEqual(
    await interpretReservationResponse(jsonResponse({ ok: true }, 201)),
    { kind: "dependency-failure", status: 502, reason: "invalid-response" },
  );
  assert.deepEqual(
    await interpretReservationResponse(new Response("not json", { status: 201 })),
    { kind: "dependency-failure", status: 502, reason: "invalid-response" },
  );
});

test("separates stale cart ids from canonical artworks without dropping valid items", () => {
  const artworks = [
    { id: "available", availability: "available", verificationStatus: "verified" },
    { id: "pending", availability: "available", verificationStatus: "pending" },
  ];

  assert.deepEqual(resolveCartArtworks(["available", "deleted", "pending"], artworks), {
    items: [artworks[0], artworks[1]],
    missingArtworkIds: ["deleted"],
  });
});
