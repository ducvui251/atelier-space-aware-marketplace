-- Phase 1 (defect 3.6): Verification's decision note, reviewer and decision
-- timestamp are durably recorded in verification.artwork_verifications /
-- verification.artist_verifications, but Artist & Artwork's projection —
-- the row the artist dashboard and admin queue actually read — never
-- carried them past a bare status column. This adds the columns the
-- Artwork/Artist contract types already declare (verificationNote,
-- reviewedBy, reviewedAt) so the projection can be updated to match.

alter table artist_artwork.artworks
  add column if not exists verification_note text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz;

alter table artist_artwork.artist_profiles
  add column if not exists verification_note text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz;
