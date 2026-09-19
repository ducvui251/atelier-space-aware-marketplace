/**
 * Real integration with Shippo (api.goshippo.com) — the international/
 * multi-carrier equivalent of GHN for a project that (per the shipping
 * research doc) needs to work outside Vietnam. Every function here degrades
 * to "no result" (empty rates / null label) on any failure — missing
 * token, network error, non-2xx, a shipment with no usable rates — so the
 * caller (shipping-rate.ts / waybill.ts) can fall back to the placeholder
 * formula / simulated waybill instead of breaking checkout or shipping.
 */

const SHIPPO_BASE_URL = "https://api.goshippo.com";

export interface ShippoAddress {
  name: string;
  street1: string;
  city: string;
  state?: string;
  zip: string;
  country: string; // ISO 3166-1 alpha-2, e.g. "US", "VN"
  phone?: string;
  email?: string;
}

export interface ShippoParcel {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightGrams: number;
}

export interface ShippoRate {
  objectId: string;
  provider: string;
  serviceLevel: string;
  amount: number;
  currency: string;
}

export interface ShippoLabel {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
}

function isConfigured(): boolean {
  return Boolean(process.env.SHIPPO_API_TOKEN);
}

async function shippoFetch(path: string, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${SHIPPO_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `ShippoToken ${process.env.SHIPPO_API_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns every rate Shippo could quote for the route, cheapest first.
 * Empty array (not a throw) on any failure or missing token — the whole
 * point is a safe input to "pick the first one, or fall back".
 */
export async function getShippingRates(from: ShippoAddress, to: ShippoAddress, parcel: ShippoParcel): Promise<ShippoRate[]> {
  if (!isConfigured()) return [];
  const body = await shippoFetch("/shipments/", {
    address_from: { name: from.name, street1: from.street1, city: from.city, state: from.state ?? "", zip: from.zip, country: from.country, phone: from.phone ?? "", email: from.email ?? "" },
    address_to: { name: to.name, street1: to.street1, city: to.city, state: to.state ?? "", zip: to.zip, country: to.country, phone: to.phone ?? "", email: to.email ?? "" },
    parcels: [{ length: String(parcel.lengthCm), width: String(parcel.widthCm), height: String(parcel.heightCm), distance_unit: "cm", weight: String(parcel.weightGrams), mass_unit: "g" }],
    async: false,
  }) as { status?: string; rates?: Array<{ object_id: string; provider: string; servicelevel?: { name?: string }; amount: string; currency: string }> } | null;
  if (!body || body.status !== "SUCCESS" || !Array.isArray(body.rates)) return [];
  return body.rates
    .map((r) => ({ objectId: r.object_id, provider: r.provider, serviceLevel: r.servicelevel?.name ?? "", amount: Number(r.amount), currency: r.currency }))
    .filter((r) => Number.isFinite(r.amount))
    .sort((a, b) => a.amount - b.amount);
}

/** Purchases an actual (test-mode, if using a test token) label for a given rate. */
export async function purchaseLabel(rate: ShippoRate): Promise<ShippoLabel | null> {
  if (!isConfigured()) return null;
  const body = await shippoFetch("/transactions/", {
    rate: rate.objectId,
    label_file_type: "PDF",
    async: false,
  }) as { status?: string; tracking_number?: string; tracking_url_provider?: string; label_url?: string } | null;
  if (!body || body.status !== "SUCCESS" || !body.tracking_number) return null;
  return {
    carrier: `${rate.provider}${rate.serviceLevel ? ` ${rate.serviceLevel}` : ""}`,
    trackingNumber: body.tracking_number,
    trackingUrl: body.tracking_url_provider || undefined,
    labelUrl: body.label_url || undefined,
  };
}
