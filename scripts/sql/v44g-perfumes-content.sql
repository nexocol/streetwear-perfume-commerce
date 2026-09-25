-- V4.4G: verified content for the two EL PUNTO perfumes.
-- Prerequisite: schema v2 (products.fragrance_family). The Worker applies it automatically on the first API request after deploy.
-- Touches ONLY perfume-01 / perfume-02 and ONLY: name, name_status, subtitle, description, fragrance_family, features_json, updated_at.
-- price, stock, status, slug, category, media, variants and collections are not modified.
-- Sources: Valentino Beauty (official product page); Lattafa (official notes) + Lattafa USA store (Eau de Parfum spray).
-- Noble Blush "Floral frutal gourmand" is the store's chosen classification (documented by Fragrantica, NOT published by Lattafa).

UPDATE products SET
  name='Valentino Donna Born in Roma Eau de Parfum',
  name_status='confirmed',
  subtitle='Eau de Parfum',
  description='Fragancia ámbar floral que combina la luminosidad del jazmín Sambac con el carácter amaderado y especiado del cashmeran y un fondo cálido de vainilla Bourbon.',
  fragrance_family='Ámbar floral',
  features_json='["Salida: Jazmín Sambac","Corazón: Cashmeran","Fondo: Vainilla Bourbon"]',
  updated_at=CURRENT_TIMESTAMP
WHERE id='perfume-01' AND slug='ref-temporal-perfume-01';

UPDATE products SET
  name='Lattafa Badee Al Oud Noble Blush',
  name_status='confirmed',
  subtitle='Eau de Parfum',
  description='Fragancia dulce y cremosa que abre con leche de rosas, continúa con almendra y merengue y termina sobre una base cálida de sándalo, vainilla y almizcle.',
  fragrance_family='Floral frutal gourmand',
  features_json='["Salida: Leche de rosas","Corazón: Almendra · Merengue","Fondo: Sándalo · Vainilla · Almizcle"]',
  updated_at=CURRENT_TIMESTAMP
WHERE id='perfume-02' AND slug='ref-temporal-perfume-02';
