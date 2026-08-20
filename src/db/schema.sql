CREATE TABLE IF NOT EXISTS tenant_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    brand_name TEXT NOT NULL,
    contact_info TEXT,
    tg_chat_id TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    article TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_article ON products(article);
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    type TEXT CHECK(type IN ('vin', 'general')) NOT NULL,
    vin TEXT,
    description TEXT NOT NULL,
    contact TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
