/**
 * Shipping Phase 2: calculates a real (charged, not just displayed) shipping
 * fee per artwork. This is the one function a later phase swaps for an
 * actual carrier-rate API call (e.g. GHN's POST /v2/shipping-order/fee,
 * see the shipping research doc) — everything else (the quote route,
 * checkout's total_amount) calls this and doesn't care how the number was
 * produced.
 *
 * Until a carrier is wired up, "calculated" uses a weight-tiered placeholder
 * formula plus a same-region discount, the same spirit as Saatchi Art's own
 * pre-carrier-API model (a size/weight/origin-based flat rate they
 * negotiated, not a live per-shipment lookup). flat_rate skips the formula
 * entirely and returns the artist's own fixed amount, mirroring Etsy's
 * per-listing flat-rate option.
 */

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
