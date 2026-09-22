PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations(
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories(
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fits(
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collections(
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products(
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_status TEXT NOT NULL DEFAULT 'provisional',
  subtitle TEXT,
  description TEXT,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  fit TEXT,
  color TEXT,
  price REAL,
  compare_at_price REAL,
  featured INTEGER NOT NULL DEFAULT 0,
  best_seller INTEGER NOT NULL DEFAULT 0,
  new_arrival INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','hidden','archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  features_json TEXT NOT NULL DEFAULT '[]',
  shopify_product_id TEXT,
  shopify_handle TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS variants(
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  color TEXT,
  sku TEXT,
  price REAL,
  stock INTEGER,
  available INTEGER NOT NULL DEFAULT 1,
  shopify_variant_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_media(
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK(media_type IN ('hero','front','back','detail','model','editorial','thumbnail')),
  r2_key TEXT,
  public_url TEXT,
  alt TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_collections(
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY(product_id,collection_id)
);

CREATE TABLE IF NOT EXISTS homepage_settings(
  id TEXT PRIMARY KEY,
  hero_product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  hero_secondary_product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  hero_headline TEXT NOT NULL,
  hero_subheadline TEXT NOT NULL,
  featured_product_ids_json TEXT NOT NULL DEFAULT '[]',
  fragrance_primary_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  fragrance_secondary_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  editorial_product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  editorial_image_url TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_settings(
  id TEXT PRIMARY KEY,
  brand_name TEXT,
  logo_url TEXT,
  instagram TEXT,
  whatsapp TEXT,
  email TEXT,
  shipping_copy TEXT,
  changes_copy TEXT,
  advisory_copy TEXT,
  store_status TEXT NOT NULL DEFAULT 'preview',
  shopify_enabled INTEGER NOT NULL DEFAULT 0,
  preview_noindex INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_audit_log(
  id TEXT PRIMARY KEY,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_status_sort ON products(status,sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_sort ON variants(product_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_media_product_sort ON product_media(product_id,sort_order);
CREATE INDEX IF NOT EXISTS idx_product_collections_collection ON product_collections(collection_id);
