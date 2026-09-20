CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    plan TEXT DEFAULT 'basic',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tenant_config (
    id INTEGER PRIMARY KEY,
    brand_name TEXT NOT NULL,
    contact_info TEXT,
    tg_chat_id TEXT NOT NULL,
    phone TEXT,
    about TEXT,
    admin_password TEXT,
    shop_name TEXT,
    slogan TEXT,
    payment_text TEXT,
    delivery_text TEXT,
    hero_url TEXT,
    color_primary TEXT,
    color_accent TEXT,
    car_brands_json TEXT,
    categories_json TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    avail TEXT,
    photo_url TEXT, country TEXT,
    car_brand TEXT,
    model TEXT,
    year TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_article ON products(article);
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER DEFAULT 1,
    type TEXT CHECK(type IN ('vin','general')) NOT NULL,
    vin TEXT,
    description TEXT NOT NULL,
    contact TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
