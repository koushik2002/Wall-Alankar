PRAGMA foreign_keys = ON;

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  room TEXT,
  style TEXT,
  short_description TEXT,
  description TEXT,
  material TEXT,
  finish TEXT,
  dimensions TEXT,
  hsn_code TEXT,
  gst_rate_bps INTEGER,
  primary_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','inactive','coming_soon')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((status = 'coming_soon' AND sku IS NULL) OR (status != 'coming_soon' AND sku IS NOT NULL)),
  CHECK (gst_rate_bps IS NULL OR gst_rate_bps >= 0)
);

CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default',
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  mrp_minor INTEGER CHECK (mrp_minor IS NULL OR mrp_minor >= price_minor),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_balances (
  variant_id INTEGER PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE enquiries (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city_pin TEXT NOT NULL,
  displayed_total_minor INTEGER NOT NULL CHECK (displayed_total_minor >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','returned')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  enquiry_id TEXT NOT NULL UNIQUE REFERENCES enquiries(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','returned')),
  confirmed_at TEXT,
  cancelled_at TEXT,
  returned_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  displayed_unit_price_minor INTEGER NOT NULL CHECK (displayed_unit_price_minor >= 0),
  UNIQUE(order_id, variant_id)
);

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  order_id TEXT REFERENCES orders(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('opening','sale','return','adjustment','import')),
  quantity_delta INTEGER NOT NULL CHECK (quantity_delta != 0),
  reason TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  actor_email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoice_snapshots (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  customer_json TEXT NOT NULL,
  subtotal_minor INTEGER NOT NULL,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  taxable_minor INTEGER NOT NULL,
  cgst_minor INTEGER NOT NULL DEFAULT 0,
  sgst_minor INTEGER NOT NULL DEFAULT 0,
  igst_minor INTEGER NOT NULL DEFAULT 0,
  delivery_minor INTEGER NOT NULL DEFAULT 0,
  rounding_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL,
  legal_details_verified INTEGER NOT NULL DEFAULT 0 CHECK (legal_details_verified IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (subtotal_minor - discount_minor = taxable_minor),
  CHECK (taxable_minor + cgst_minor + sgst_minor + igst_minor + delivery_minor + rounding_minor = total_minor)
);

CREATE TABLE invoice_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id TEXT NOT NULL REFERENCES invoice_snapshots(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  hsn_code TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  taxable_minor INTEGER NOT NULL,
  gst_rate_bps INTEGER,
  cgst_minor INTEGER NOT NULL DEFAULT 0,
  sgst_minor INTEGER NOT NULL DEFAULT 0,
  igst_minor INTEGER NOT NULL DEFAULT 0,
  line_total_minor INTEGER NOT NULL
);

CREATE TABLE tally_export_batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared','downloaded','confirmed_imported','failed')),
  inventory_payload TEXT NOT NULL,
  sales_payload TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  error_message TEXT,
  prepared_by TEXT NOT NULL,
  prepared_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  downloaded_at TEXT,
  confirmed_at TEXT
);

CREATE TABLE tally_export_invoices (
  batch_id TEXT NOT NULL REFERENCES tally_export_batches(id) ON DELETE RESTRICT,
  invoice_id TEXT NOT NULL REFERENCES invoice_snapshots(id) ON DELETE RESTRICT,
  PRIMARY KEY (batch_id, invoice_id)
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_catalogue ON products(status, category_id, room, name);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX idx_stock_movements_variant ON stock_movements(variant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id, created_at DESC);
