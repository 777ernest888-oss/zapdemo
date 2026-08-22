const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || '/app/data/parts.db';
const db = new Database(DB_PATH);
function like(v) { return '%' + String(v).trim() + '%'; }
router.get('/', (req, res) => {
try {
const q = req.query.q, cat = req.query.category, br = req.query.brand, cb = req.query.car_brand;
const limit = parseInt(req.query.limit) || 20;
const offset = parseInt(req.query.offset) || 0;
let sql = 'SELECT * FROM products WHERE 1=1';
let cnt = 'SELECT COUNT(*) AS total FROM products WHERE 1=1';
const p = [], pc = [];
if (q) { sql += ' AND (article LIKE ? OR name LIKE ?)'; cnt += ' AND (article LIKE ? OR name LIKE ?)'; p.push(like(q), like(q)); pc.push(like(q), like(q)); }
if (cat) { sql += ' AND category = ?'; cnt += ' AND category = ?'; p.push(cat); pc.push(cat); }
if (br) { sql += ' AND brand = ?'; cnt += ' AND brand = ?'; p.push(br); pc.push(br); }
if (cb) { sql += ' AND car_brand = ?'; cnt += ' AND car_brand = ?'; p.push(cb); pc.push(cb); }
sql += ' ORDER BY article LIMIT ? OFFSET ?';
p.push(limit, offset);
const items = db.prepare(sql).all(...p);
const total = db.prepare(cnt).get(...pc).total;
res.json({ items: items, total: total, limit: limit, offset: offset });
} catch (e) { console.error('[API]', e.message); res.status(500).json({ error: e.message }); }
});
router.get('/categories', (req, res) => {
try {
res.json(db.prepare('SELECT DISTINCT name FROM categories ORDER BY name').all().map(function (r) { return r.name; }));
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/brands', (req, res) => {
try {
res.json(db.prepare('SELECT DISTINCT name FROM brands ORDER BY name').all().map(function (r) { return r.name; }));
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/car_brands', (req, res) => {
try {
res.json(db.prepare("SELECT DISTINCT car_brand FROM products WHERE car_brand IS NOT NULL AND car_brand != '' ORDER BY car_brand").all().map(function (r) { return r.car_brand; }));
} catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
