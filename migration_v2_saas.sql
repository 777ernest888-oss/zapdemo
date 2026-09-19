CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    plan TEXT DEFAULT 'basic',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO tenants (id, name, slug, status, plan) VALUES (1, 'Демо автозапчасти', 'demo', 'active', 'lifetime');
CREATE TABLE tenant_config_new (
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
INSERT INTO tenant_config_new (id, brand_name, contact_info, tg_chat_id, phone, about, admin_password, shop_name, slogan, payment_text, delivery_text, hero_url, color_primary, color_accent, car_brands_json, categories_json, updated_at)
SELECT id, brand_name, contact_info, tg_chat_id, phone, about, admin_password, shop_name, slogan, payment_text, delivery_text, hero_url, color_primary, color_accent, car_brands_json, categories_json, updated_at FROM tenant_config;
DROP TABLE tenant_config;
ALTER TABLE tenant_config_new RENAME TO tenant_config;
