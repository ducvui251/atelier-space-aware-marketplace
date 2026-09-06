insert into artist_artwork.artist_profiles
  (id, user_id, display_name, bio, location, nationality, portfolio_url, verification_status, image_url)
values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000101', 'Lena Moreau', 'Abstraction and the memory of place.', 'Paris, France', 'French', 'https://lenamoreau.example.com', 'verified', 'https://picsum.photos/seed/artist-lena/800/1000'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000102', 'Aki Tanaka', 'Mineral pigments and meditative field works.', 'Kyoto, Japan', 'Japanese', null, 'verified', 'https://picsum.photos/seed/artist-aki/800/1000'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000103', 'Maria Wood', 'Photographs of the built environment.', 'Melbourne, Australia', 'Australian', 'https://mariawood.example.com', 'pending', 'https://picsum.photos/seed/artist-maria/800/1000')
on conflict (id) do nothing;

insert into artist_artwork.artworks
  (id, artist_id, title, description, medium, width_cm, height_cm, creation_year, price, currency, edition_type, availability, verification_status, orientation, dominant_colors, styles)
values
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000001', 'Morning Tide', 'Layered pigment and wax on canvas.', 'Oil and wax on canvas', 90, 110, 2024, 1280, 'USD', 'original', 'available', 'verified', 'portrait', '["Ivory", "Warm Grey", "Sand"]', '["Abstract", "Organic"]'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000001', 'Ember Field', null, 'Oil on canvas', 120, 90, 2023, 960, 'USD', 'original', 'available', 'verified', 'landscape', '["Terracotta", "Charcoal", "Ochre"]', '["Abstract", "Gestural"]'),
  ('00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000002', 'Infinite Courtyard', null, 'Mineral pigment on washi', 100, 100, 2024, 1580, 'USD', 'original', 'available', 'verified', 'square', '["Ink", "Stone", "Pale Moss"]', '["Abstract", "Minimal"]'),
  ('00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000002', 'Vermilion Study', null, 'Mineral pigment on paper', 60, 80, 2024, 640, 'USD', 'limited-edition', 'available', 'verified', 'portrait', '["Vermilion", "Bone", "Charcoal"]', '["Abstract", "Minimal"]'),
  ('00000000-0000-4000-8000-000000001005', '00000000-0000-4000-8000-000000000003', 'Concrete Light', null, 'Archival pigment print', 80, 60, 2023, 540, 'USD', 'limited-edition', 'available', 'pending', 'landscape', '["Grey", "Concrete", "Sky"]', '["Photography", "Architecture"]')
on conflict (id) do nothing;

insert into artist_artwork.artwork_images (artwork_id, image_url, alt_text, is_primary)
values
  ('00000000-0000-4000-8000-000000001001', 'https://picsum.photos/seed/art-01/900/1100', 'Morning Tide', true),
  ('00000000-0000-4000-8000-000000001002', 'https://picsum.photos/seed/art-02/1200/900', 'Ember Field', true),
  ('00000000-0000-4000-8000-000000001003', 'https://picsum.photos/seed/art-05/1000/1000', 'Infinite Courtyard', true),
  ('00000000-0000-4000-8000-000000001004', 'https://picsum.photos/seed/art-06/800/1000', 'Vermilion Study', true),
  ('00000000-0000-4000-8000-000000001005', 'https://picsum.photos/seed/art-07/1200/900', 'Concrete Light', true)
on conflict do nothing;
