/**
 * Shipping Phase 2 (upgraded in Phase "Shippo"): calculates the real
 * (charged, not just displayed) shipping fee per artwork.
 *
 * resolveShippingRate() is what the quote route and checkout actually call:
 * for "calculated" shipping it asks Shippo (api.goshippo.com) for real
 * carrier rates and takes the cheapest one; calculateShippingRate() below
 * is the placeholder weight-tiered formula it falls back to whenever Shippo
 * isn't configured, has no token, or returns no usable rate for the route —
 * missing origin/destination country, an unsupported lane, a dependency
 * timeout, etc. flat_rate never touches Shippo at all: it's the artist's
 * own fixed amount, mirroring Etsy's per-listing flat-rate option.
 */
import { getShippingRates, type ShippoAddress } from "../infrastructure/shippo-client.ts";

const CALCULATED_BASE_FEE = 8;
const CALCULATED_PER_KG_FEE = 3;
const CROSS_REGION_SURCHARGE = 10;
const DEFAULT_WEIGHT_GRAMS = 1000; // assumed when the artist hasn't set a weight yet

export interface ShippingRateInput {
  shippingMethod: "calculated" | "flat_rate";
  flatRateAmount?: number;
  packageWeightGrams?: number;
  currency: string;
}

export interface ShippingRateResult {
  amount: number;
  currency: string;
  method: "calculated" | "flat_rate";
}

/**
 * Loose "same broad region" heuristic: compares the leading 2 characters of
 * each postal code. Good enough for a placeholder surcharge decision; a real
 * carrier API would resolve this from actual district/zone data instead.
 */
export function isSameRegion(originPostalCode: string | null, buyerPostalCode: string): boolean {
  if (!originPostalCode) return false;
  return originPostalCode.trim().slice(0, 2) === buyerPostalCode.trim().slice(0, 2);
}

export function calculateShippingRate(artwork: ShippingRateInput, sameRegion: boolean): ShippingRateResult {
  if (artwork.shippingMethod === "flat_rate") {
    return { amount: artwork.flatRateAmount ?? 0, currency: artwork.currency, method: "flat_rate" };
  }
  const weightKg = (artwork.packageWeightGrams ?? DEFAULT_WEIGHT_GRAMS) / 1000;
  const surcharge = sameRegion ? 0 : CROSS_REGION_SURCHARGE;
  const amount = Math.round((CALCULATED_BASE_FEE + CALCULATED_PER_KG_FEE * weightKg + surcharge) * 100) / 100;
  return { amount, currency: artwork.currency, method: "calculated" };
}

/**
 * Packed-box dimensions aren't collected separately from the artwork's own
 * size (Step 1 only added weight) — approximated from width/height plus
 * fixed packaging padding. Good enough for a rate lookup; a real system
 * would let the artist declare box dimensions independently, the same way
 * it lets them declare weight.
 */
export function derivePackageDimensionsCm(widthCm: number, heightCm: number): { lengthCm: number; widthCm: number; heightCm: number } {
  return { lengthCm: Math.max(10, Math.round(widthCm + 4)), widthCm: Math.max(10, Math.round(heightCm + 4)), heightCm: 5 };
}

export interface ShippingOrigin {
  name: string;
  postalCode: string | null;
  country: string | null;
  phone?: string | null;
  email?: string | null;
  state?: string | null;
}

export interface ShippingDestination {
  name: string;
  street1: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
  state?: string;
}

/**
 * The one function a later phase wouldn't need to touch again — it already
 * tries the real carrier API first. Falls back to calculateShippingRate()
 * whenever Shippo can't quote this route (no token, no origin country, no
 * rates returned).
 */
export async function resolveShippingRate(
  artwork: ShippingRateInput & { widthCm: number; heightCm: number },
  origin: ShippingOrigin,
  destination: ShippingDestination,
): Promise<ShippingRateResult> {
  const sameRegion = isSameRegion(origin.postalCode, destination.postalCode);
  if (artwork.shippingMethod === "flat_rate") {
    return calculateShippingRate(artwork, sameRegion);
  }
  if (origin.country && origin.postalCode) {
    const dims = derivePackageDimensionsCm(artwork.widthCm, artwork.heightCm);
    // Only origin_postal_code/origin_country are collected (Step 1) — no
    // street/city for the artist's ship-from address, so a placeholder
    // stands in for street1 and the postal code doubles as city. Verified
    // empirically against Shippo's own API: still returns real domestic
    // rates this way, since the rate engine keys off zip+country.
    const from: ShippoAddress = { name: origin.name, street1: "N/A", city: origin.postalCode, state: origin.state ?? undefined, zip: origin.postalCode, country: origin.country, phone: origin.phone ?? undefined, email: origin.email ?? undefined };
    const to: ShippoAddress = { name: destination.name, street1: destination.street1, city: destination.city, state: destination.state, zip: destination.postalCode, country: destination.country, phone: destination.phone };
    const rates = await getShippingRates(from, to, { ...dims, weightGrams: artwork.packageWeightGrams ?? DEFAULT_WEIGHT_GRAMS });
    const cheapest = rates.find((r) => r.currency === artwork.currency) ?? rates[0];
    if (cheapest) return { amount: cheapest.amount, currency: cheapest.currency, method: "calculated" };
  }
  return calculateShippingRate(artwork, sameRegion);
}
