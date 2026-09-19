/**
 * Shipping Phase 3: generates the waybill (carrier + tracking number) an
 * artist gets when they mark an order shipped. No real carrier API
 * credentials exist yet (see the shipping research doc), so this is a
 * simulated waybill instead of the artist typing in whatever text they want
 * — the point is the *shape* of the flow (server assigns the tracking
 * number, not free-text input), so a later phase can swap this one function
 * for a real GHN/GHTK "create order" call without touching the route or the
 * artist-orders UI.
 */

const SIMULATED_CARRIERS = ["GHN Express", "GHTK", "Viettel Post"] as const;

export interface Waybill {
  carrier: string;
  trackingNumber: string;
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
