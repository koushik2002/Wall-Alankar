INSERT INTO categories (slug, name, sort_order) VALUES
  ('metal-art', 'Metal art', 1),
  ('mirrors', 'Mirrors', 2),
  ('paintings', 'Paintings', 3);

INSERT INTO products (id, slug, sku, name, category_id, room, style, material, dimensions, primary_image_url, status) VALUES
  (1, 'mayura-sculptural-study', 'WA-001', 'Mayura / sculptural study', 1, 'Living', 'Sculptural', 'Brass finish · indigo metal', '122 × 76 cm', '/images/wall-alankar-hero.webp', 'active'),
  (2, 'surya-brass-circle', 'WA-002', 'Surya / the brass circle', 2, 'Entryway', 'Modern heritage', 'Aged brass finish · glass', '91 × 91 cm', '/images/foyer-2026.webp', 'active'),
  (3, 'linea-oak-reflection', 'WA-003', 'Linea / oak reflection', 2, 'Bedroom', 'Natural', 'Oak finish · glass', '60 × 90 cm', '/images/gallery-mirror.jpg', 'active'),
  (4, 'svara-quiet-composition', 'WA-004', 'Svara / a quiet composition', 3, 'Living', 'Textural', 'Textured canvas · wood frame', '80 × 100 cm', '/images/gallery-canvas.jpg', 'active'),
  (5, 'metal-stories-coming-soon', NULL, 'Metal stories / volume II', 1, 'Dining', 'Sculptural', NULL, NULL, '/images/wall-alankar-craft.webp', 'coming_soon'),
  (6, 'heirloom-mirrors-coming-soon', NULL, 'Heirloom mirrors / volume II', 2, 'Entryway', 'Modern heritage', NULL, NULL, '/images/gallery-room.jpg', 'coming_soon'),
  (7, 'quiet-canvases-coming-soon', NULL, 'Quiet canvases / volume II', 3, 'Bedroom', 'Textural', NULL, NULL, '/images/gallery-canvas.jpg', 'coming_soon'),
  (8, 'botanical-metal-coming-soon', NULL, 'Botanical metal / first edit', 1, 'Living', 'Botanical', NULL, NULL, '/images/wall-alankar-hero.webp', 'coming_soon'),
  (9, 'soft-geometry-coming-soon', NULL, 'Soft geometry / mirrors', 2, 'Dining', 'Geometric', NULL, NULL, '/images/foyer-2026.webp', 'coming_soon'),
  (10, 'earth-pigments-coming-soon', NULL, 'Earth pigments / studies', 3, 'Living', 'Organic', NULL, NULL, '/images/gallery-canvas.jpg', 'coming_soon'),
  (11, 'brass-reliefs-coming-soon', NULL, 'Brass reliefs / small works', 1, 'Entryway', 'Modern heritage', NULL, NULL, '/images/wall-alankar-craft.webp', 'coming_soon'),
  (12, 'bedside-reflections-coming-soon', NULL, 'Bedside reflections / edit', 2, 'Bedroom', 'Minimal', NULL, NULL, '/images/gallery-mirror.jpg', 'coming_soon'),
  (13, 'large-format-art-coming-soon', NULL, 'Large format / quiet walls', 3, 'Dining', 'Abstract', NULL, NULL, '/images/gallery-room.jpg', 'coming_soon'),
  (14, 'indigo-objects-coming-soon', NULL, 'Indigo objects / signature', 1, 'Bedroom', 'Sculptural', NULL, NULL, '/images/wall-alankar-hero.webp', 'coming_soon'),
  (15, 'curators-next-edit', NULL, 'The curator’s next edit', 3, 'Entryway', 'Curated', NULL, NULL, '/images/foyer-2026.webp', 'coming_soon');

INSERT INTO product_variants (id, product_id, sku, price_minor) VALUES
  (1, 1, 'WA-001', 1850000),
  (2, 2, 'WA-002', 1290000),
  (3, 3, 'WA-003', 890000),
  (4, 4, 'WA-004', 1140000);

INSERT INTO inventory_balances (variant_id, quantity) VALUES (1,6),(2,4),(3,3),(4,0);

INSERT INTO stock_movements (id, variant_id, movement_type, quantity_delta, reason, idempotency_key, actor_email) VALUES
  ('seed-movement-1', 1, 'opening', 6, 'Launch seed', 'seed-opening-WA-001', 'system'),
  ('seed-movement-2', 2, 'opening', 4, 'Launch seed', 'seed-opening-WA-002', 'system'),
  ('seed-movement-3', 3, 'opening', 3, 'Launch seed', 'seed-opening-WA-003', 'system');
