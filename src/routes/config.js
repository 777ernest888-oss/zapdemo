const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH || '/app/data/parts.db');
router.get('/', function (req, res) {
try {
const t = parseInt(req.query.tenant) || 1;
const r = db.prepare('SELECT brand_name, shop_name, slogan, phone, contact_info, about, payment_text, delivery_text, hero_url, color_primary, color_accent, car_brands_json, categories_json, updated_at FROM tenant_config WHERE id=?').get(t);
const o = r || {};
o.car_brands = JSON.parse(o.car_brands_json || '[]');
o.categories = JSON.parse(o.categories_json || '[]');
delete o.car_brands_json; delete o.categories_json;
res.json(o);
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/analogs/:id', function (req, res) {
try {
const t = parseInt(req.query.tenant) || 1;
const p = db.prepare('SELECT category, car_brand, price FROM products WHERE id=? AND tenant_id=?').get(req.params.id, t);
if (!p) return res.json([]);
res.json(db.prepare('SELECT id, article, name, price, stock FROM products WHERE id!=? AND tenant_id=? AND (category=? OR car_brand=?) AND price<=? ORDER BY price ASC LIMIT 10').all(req.params.id, t, p.category, p.car_brand, p.price));
} catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
