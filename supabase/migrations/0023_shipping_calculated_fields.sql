-- Shipping Phase 1 (data foundation, Etsy-style calculated shipping model):
-- an artist declares the PACKED weight of an artwork once at listing time
-- and picks flat_rate (a fixed amount they set) or calculated (a real
-- carrier-rate lookup, wired up in a later phase) the same way Etsy lets a
-- seller choose per listing. Postal code is the carrier-agnostic location
-- identifier for both ends of the shipment -- deliberately not a specific
-- carrier's own district/ward id scheme (e.g. GHN's), so this stays usable
-- regardless of which carrier API gets integrated later.

alter table artist_artwork.artworks
  add column if not exists package_weight_grams numeric(8, 2) check (package_weight_grams is null or package_weight_grams > 0),
  add column if not exists shipping_method varchar(20) not null default 'calculated' check (shipping_method in ('calculated', 'flat_rate')),
  add column if not exists flat_rate_amount numeric(12, 2) check (flat_rate_amount is null or flat_rate_amount >= 0);

alter table artist_artwork.artist_profiles
  add column if not exists origin_postal_code varchar(20);
