-- Shipping Phase 2/3 upgrade: real Shippo integration (api.goshippo.com).
-- Shippo needs a country (and ideally state) for both ends of a shipment --
-- origin_postal_code alone (added in 0021) isn't enough to call a real
-- carrier-rate API. origin_country pairs with it the same way
-- shippingAddress.country pairs with buyerPostalCode on the checkout side
-- (that one lives in the jsonb shipping_address column, no migration
-- needed for it).
--
-- origin_phone/origin_email: confirmed live against Shippo's own API that
-- purchasing a label (not just quoting a rate) fails for at least USPS
-- without a sender phone and email ("Seller email and phone number
-- required for USPS") -- without these, resolveWaybill() falls back to
-- the simulated waybill on every single ship, which defeats the point of
-- the real integration.
-- origin_state: confirmed live that Shippo rejects a label *purchase*
-- (though not a rate *quote*) for a US address with no state at all --
-- "A rate may only be purchased if it was generated with complete address
-- information" -- street1 can stay a placeholder, but state can't be
-- omitted. Optional column since most countries don't use one.
alter table artist_artwork.artist_profiles
  add column if not exists origin_country varchar(2),
  add column if not exists origin_phone varchar(30),
  add column if not exists origin_email varchar(255),
  add column if not exists origin_state varchar(10);

-- Real Shippo labels come with a tracking URL and a printable label PDF --
-- the simulated waybill (Phase 3) had neither. Both are optional: still
-- null for shipments created before this migration or via the simulated
-- fallback when Shippo isn't configured/reachable.
alter table commerce.shipments
  add column if not exists tracking_url varchar(1000),
  add column if not exists label_url varchar(1000);
