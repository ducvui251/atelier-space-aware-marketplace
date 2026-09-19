/**
 * Shipping Phase 3 (upgraded in Phase "Shippo"): produces the waybill
 * (carrier + tracking number, now also a tracking URL and printable label)
 * an artist gets when they mark an order shipped.
 *
 * resolveWaybill() is what the ship route actually calls: it re-quotes real
 * Shippo rates for this exact shipment and purchases the cheapest one as an
 * actual (test-mode) label. Checkout-time and ship-time rates aren't reused
 * across each other on purpose — carrier rate quotes expire (Shippo's are
 * good for a matter of days), so re-querying fresh at ship time is more
 * correct than trying to keep a days-old quote alive. generateWaybill()
 * below is the simulated fallback whenever Shippo isn't configured or
 * can't quote/label this route.
 */
import { getShippingRates, purchaseLabel, type ShippoAddress } from "../infrastructure/shippo-client.ts";
import { derivePackageDimensionsCm, type ShippingDestination, type ShippingOrigin } from "./shipping-rate.ts";

const SIMULATED_CARRIERS = ["GHN Express", "GHTK", "Viettel Post"] as const;
const DEFAULT_WEIGHT_GRAMS = 1000;

export interface Waybill {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
}

/**
 * Deterministic in the order id so re-running this for the same order (a
 * retried request, say) always assigns the same carrier — a real carrier API
 * response would be authoritative instead of this derivation.
 */
export function generateWaybill(orderId: string): Waybill {
  const hash = [...orderId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const carrier = SIMULATED_CARRIERS[hash % SIMULATED_CARRIERS.length];
  const prefix = carrier.replace(/[^A-Z]/g, "").slice(0, 3) || "SHP";
  const trackingNumber = `${prefix}${orderId.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  return { carrier, trackingNumber };
}

export async function resolveWaybill(
  orderId: string,
  artwork: { widthCm: number; heightCm: number; packageWeightGrams?: number },
  origin: ShippingOrigin,
  destination: ShippingDestination,
): Promise<Waybill> {
  if (origin.country && origin.postalCode) {
    const dims = derivePackageDimensionsCm(artwork.widthCm, artwork.heightCm);
    const from: ShippoAddress = { name: origin.name, street1: "N/A", city: origin.postalCode, state: origin.state ?? undefined, zip: origin.postalCode, country: origin.country, phone: origin.phone ?? undefined, email: origin.email ?? undefined };
    const to: ShippoAddress = { name: destination.name, street1: destination.street1, city: destination.city, state: destination.state, zip: destination.postalCode, country: destination.country, phone: destination.phone };
    const rates = await getShippingRates(from, to, { ...dims, weightGrams: artwork.packageWeightGrams ?? DEFAULT_WEIGHT_GRAMS });
    for (const rate of rates) {
      const label = await purchaseLabel(rate);
      if (label) return label;
      // This specific rate failed to convert into a label (e.g. missing
      // carrier-required field) — try the next-cheapest rather than
      // give up on the whole shipment.
    }
  }
  return generateWaybill(orderId);
}
