const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || '/app/data/parts.db';
const db = new Database(DB_PATH);
const fails = new Map();
const WIN = 10 * 60 * 1000;
function passValid(pass) {
try {
const row = db.prepare('SELECT admin_password FROM tenant_config WHERE id=1').get();
if (row && row.admin_password) return pass === row.admin_password;
} catch (e) {}
return process.env.ADMIN_PASSWORD ? pass === process.env.ADMIN_PASSWORD : false;
}
router.use(function (req, res, next) {
const pass = req.headers['x-admin-pass'] || '';
if (passValid(pass)) return next();
const ip = req.ip || 'unk';
const now = Date.now();
let rec = fails.get(ip);
if (!rec || now - rec.start > WIN) { rec = { start: now, count: 0 }; fails.set(ip, rec); }
rec.count += 1;
if (rec.count > 10) return res.status(429).json({ error: 'too many wrong passwords, retry in 10 min' });
res.status(401).json({ error: 'unauthorized' });
});
router.get('/products', function (req, res) {
try { res.json(db.prepare('SELECT * FROM products ORDER BY id DESC LIMIT 100').all()); }
catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/requests', function (req, res) {
try { res.json(db.prepare('SELECT * FROM requests ORDER BY id DESC LIMIT 50').all()); }
catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/settings', function (req, res) {
try {
const r = db.prepare('SELECT brand_name, contact_info, phone, about, tg_chat_id, admin_password FROM tenant_config WHERE id=1').get();
res.json(r || {});
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/products', function (req, res) {
try {
const b = req.body;
if (!b.article || !b.name || b.price === null || b.price === undefined || isNaN(Number(b.price))) return res.status(400).json({ error: 'article, name, price required' });
const stock = (b.stock === null || b.stock === '' || isNaN(Number(b.stock))) ? 0 : Number(b.stock);
const r = db.prepare('INSERT INTO products (article, name, category, brand, price, stock, car_brand, photo_url) VALUES (?,?,?,?,?,?,?,?)').run(String(b.article).trim(), String(b.name).trim(), b.category || null, b.brand || null, Number(b.price), stock, b.car_brand || null, b.photo_url || null);
res.json({ ok: true, id: r.lastInsertRowid });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/products/:id', function (req, res) {
try {
const b = req.body;
const stock = (b.stock === null || b.stock === '' || isNaN(Number(b.stock))) ? 0 : Number(b.stock);
const r = db.prepare('UPDATE products SET article=?, name=?, category=?, brand=?, price=?, stock=?, car_brand=?, photo_url=? WHERE id=?').run(String(b.article).trim(), String(b.name).trim(), b.category || null, b.brand || null, Number(b.price), stock, b.car_brand || null, b.photo_url || null, Number(req.params.id));
res.json({ ok: true, changed: r.changes });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/products/:id', function (req, res) {
try {
const r = db.prepare('DELETE FROM products WHERE id=?').run(Number(req.params.id));
res.json({ ok: true, changed: r.changes });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/requests/:id', function (req, res) {
try {
const r = db.prepare('DELETE FROM requests WHERE id=?').run(Number(req.params.id));
res.json({ ok: true, changed: r.changes });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/settings', function (req, res) {
try {
const b = req.body;
const cur = db.prepare('SELECT * FROM tenant_config WHERE id=1').get() || {};
const phone = (b.phone !== undefined) ? String(b.phone).trim() : (cur.phone || '');
const contact = (b.contact_info !== undefined) ? String(b.contact_info).trim() : (cur.contact_info || '');
const about = (b.about !== undefined) ? String(b.about).trim() : (cur.about || '');
const brand = (b.brand_name !== undefined) ? String(b.brand_name).trim() : (cur.brand_name || 'Автозапчасти');
const newpass = (b.new_password && String(b.new_password).trim()) ? String(b.new_password).trim() : null;
if (newpass) db.prepare('UPDATE tenant_config SET brand_name=?, contact_info=?, phone=?, about=?, admin_password=? WHERE id=1').run(brand, contact, phone, about, newpass);
else db.prepare('UPDATE tenant_config SET brand_name=?, contact_info=?, phone=?, about=? WHERE id=1').run(brand, contact, phone, about);
res.json({ ok: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
