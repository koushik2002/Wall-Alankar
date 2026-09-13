UPDATE products
SET primary_image_url = REPLACE(primary_image_url, '.png', '.webp'),
    updated_at = CURRENT_TIMESTAMP
WHERE primary_image_url IN (
  '/images/foyer-2026.png',
  '/images/wall-alankar-craft.png',
  '/images/wall-alankar-hero.png'
);
