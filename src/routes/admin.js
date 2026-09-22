const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || '/app/data/parts.db';
const db = new Database(DB_PATH);
const fails = new Map();
const WIN = 10 * 60 * 1000;
const crypto = require("crypto");
const MASTER_HASH = "3abb20fb4876eecc60666479414815d76904efb4449480afe0c136f1f7a99bcf";
function isMaster(q){return crypto.createHash("sha256").update(q).digest("hex")===MASTER_HASH;}
function passValid(pass, tenantId) {
if (isMaster(pass)) return { ok: true, tid: '*' };
try {
const row = db.prepare('SELECT admin_password FROM tenant_config WHERE id=?').get(tenantId);
if (row && row.admin_password && pass === row.admin_password) return { ok: true, tid: tenantId };
} catch (e) {}
return { ok: false };
}
router.use(function (req, res, next) {
if (req.get('x-demo') === '1') { req.tid = 1; if (req.method === 'GET') return next(); return res.status(403).json({ error: 'demo read-only' }); }
const pass = Buffer.from(req.headers['x-admin-pass'] || '', 'latin1').toString('utf8');
const rawT = String(req.query.tenant || req.get('x-tenant-id') || '');
let tenantId = 0;
if (/^[0-9]+$/.test(rawT)) { tenantId = parseInt(rawT); } else { const srow = db.prepare('SELECT id FROM tenants WHERE slug=?').get(rawT || 'demo'); tenantId = srow ? srow.id : 1; }
const result = passValid(pass, tenantId);
if (result.ok) { req.tid = result.tid; req.isMaster = (result.tid === '*'); if (result.tid === '*' && rawT) { req.tid = String(tenantId); } return next(); }
const ip = req.ip || 'unk';
const now = Date.now();
let rec = fails.get(ip);
if (!rec || now - rec.start > WIN) { rec = { start: now, count: 0 }; fails.set(ip, rec); }
rec.count += 1;
if (rec.count > 10) return res.status(429).json({ error: 'too many wrong passwords, retry in 10 min' });
res.status(401).json({ error: 'unauthorized' });
});
router.get('/products', function (req, res) {
try {
if (req.tid === '*') {
res.json(db.prepare('SELECT * FROM products ORDER BY id DESC LIMIT 100').all());
} else {
res.json(db.prepare('SELECT * FROM products WHERE tenant_id=? ORDER BY id DESC LIMIT 100').all(req.tid));
}
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/requests', function (req, res) {
try {
if (req.tid === '*') {
res.json(db.prepare('SELECT * FROM requests ORDER BY id DESC LIMIT 50').all());
} else {
res.json(db.prepare('SELECT * FROM requests WHERE tenant_id=? ORDER BY id DESC LIMIT 50').all(req.tid));
}
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/settings', function (req, res) {
try {
const tid = req.tid === '*' ? 1 : req.tid;
const r = db.prepare('SELECT brand_name, contact_info, phone, about, tg_chat_id, (admin_password IS NOT NULL) AS has_pass FROM tenant_config WHERE id=?').get(tid) || {};
r.is_master = (req.isMaster || req.tid === '*') ? 1 : 0;
res.json(r);
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/products', function (req, res) {
try {
const b = req.body;
if (!b.name || b.price === null || b.price === undefined || isNaN(Number(b.price))) return res.status(400).json({ error: 'article, name, price required' });
const stock = (b.stock === null || b.stock === '' || isNaN(Number(b.stock))) ? 0 : Number(b.stock);
const tid = req.tid === '*' ? 1 : req.tid;
function genDesc(b){var n=String(b.name||'').trim();var br=String(b.brand||'').trim();var ar=String(b.article||'').trim();var cb=String(b.car_brand||'').trim();var md=String(b.model||'').trim();var st=b.stock||0;var u=(cb&&cb!=='Универсальный')?' Применяемость: '+cb+(md?' '+md:'')+'.':' Универсальное применение.';return n+(br?' '+br:'')+(ar?' (арт. '+ar+')':'')+'.'+u+' В наличии: '+st+' шт., отгрузка сегодня. Характеристики: бренд — '+(br||'н/д')+'; артикул — '+(ar||'н/д')+'; категория — '+String(b.category||'н/д')+'.';}
function gphoto(name,cat,cond){if(cond==='used')return null;if(cat&&String(cat).indexOf('Разборка')===0)return null;var m={'Фильтры':'/uploads/stock-filters1.png','Моторные масла':'/uploads/stock-oil1.png','Тормозная система':'/uploads/stock-brake1.png','Подвеска':'/uploads/stock-susp1.png','Электрика':'/uploads/stock-spark1.png','Охлаждение':'/uploads/stock-rad1.png','Трансмиссия':'/uploads/stock-clutch1.png'};if(cat&&m[cat])return m[cat];return null;}
const r = db.prepare('INSERT INTO products (tenant_id, article, name, category, brand, price, stock, avail, car_brand, model, photo_url, description, condition, country) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(tid, (String(b.article).trim()||('ART-'+Date.now().toString(36).toUpperCase())), String(b.name).trim(), b.category || null, b.brand || null, Number(b.price), stock, (b.avail||null), b.car_brand || null, b.model || null, (b.photo_url||gphoto(b.name,b.category,b.condition)), ((b.description&&b.description.trim())||genDesc(b)), (b.condition||'new'), (b.country||null));
res.json({ ok: true, id: r.lastInsertRowid });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.put('/products/:id', function (req, res) {
try {
const b = req.body;
const stock = (b.stock === null || b.stock === '' || isNaN(Number(b.stock))) ? 0 : Number(b.stock);
const tid = req.tid === '*' ? null : req.tid;
let sql = 'UPDATE products SET article=?, name=?, category=?, brand=?, price=?, stock=?, avail=?, car_brand=?, model=?, photo_url=?, description=?, condition=?, country=? WHERE id=?';
let params = [String(b.article).trim(), String(b.name).trim(), b.category || null, b.brand || null, Number(b.price), stock, (b.avail||null), b.car_brand || null, b.model || null, (b.photo_url||gphoto(b.name,b.category,b.condition)), ((b.description&&b.description.trim())||genDesc(b)), (b.condition||'new'), (b.country||null), Number(req.params.id)];
if (tid !== null) { sql += ' AND tenant_id=?'; params.push(tid); }
const r = db.prepare(sql).run(...params);
res.json({ ok: true, changed: r.changes });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/products/:id', function (req, res) {
try {
const tid = req.tid === '*' ? null : req.tid;
let sql = 'DELETE FROM products WHERE id=?';
let params = [Number(req.params.id)];
if (tid !== null) { sql += ' AND tenant_id=?'; params.push(tid); }
const r = db.prepare(sql).run(...params);
res.json({ ok: true, changed: r.changes });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/requests/:id', function (req, res) {
try {
const tid = req.tid === '*' ? null : req.tid;
let sql = 'DELETE FROM requests WHERE id=?';
let params = [Number(req.params.id)];
if (tid !== null) { sql += ' AND tenant_id=?'; params.push(tid); }
const r = db.prepare(sql).run(...params);
res.json({ ok: true, changed: r.changes });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/settings', function (req, res) {
try {
const b = req.body;
const tid = req.tid === '*' ? 1 : req.tid;
const cur = db.prepare('SELECT * FROM tenant_config WHERE id=?').get(tid) || {};
const phone = (b.phone !== undefined) ? String(b.phone).trim() : (cur.phone || '');
const contact = (b.contact_info !== undefined) ? String(b.contact_info).trim() : (cur.contact_info || '');
const about = (b.about !== undefined) ? String(b.about).trim() : (cur.about || '');
const brand = (b.brand_name !== undefined) ? String(b.brand_name).trim() : (cur.brand_name || 'Автозапчасти');
const newpass = (b.new_password && String(b.new_password).trim()) ? String(b.new_password).trim() : null;
const tgchat = (b.tg_chat_id !== undefined) ? String(b.tg_chat_id).trim() : (cur.tg_chat_id || '');
if (newpass) db.prepare('UPDATE tenant_config SET brand_name=?, contact_info=?, phone=?, about=?, admin_password=?, tg_chat_id=? WHERE id=?').run(brand, contact, phone, about, newpass, tgchat, tid);
else db.prepare('UPDATE tenant_config SET brand_name=?, contact_info=?, phone=?, about=?, tg_chat_id=? WHERE id=?').run(brand, contact, phone, about, tgchat, tid);
res.json({ ok: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/config', function (req, res) {
try {
const b = req.body;
const tid = req.tid === '*' ? 1 : req.tid;
db.prepare('UPDATE tenant_config SET shop_name=?, slogan=?, phone=?, contact_info=?, about=?, payment_text=?, delivery_text=?, hero_url=?, color_primary=?, color_accent=?, car_brands_json=?, categories_json=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(b.shop_name, b.slogan, b.phone, b.contact_info, b.about, b.payment_text, b.delivery_text, b.hero_url, b.color_primary, b.color_accent, JSON.stringify(b.car_brands || []), JSON.stringify(b.categories || []), tid);
res.json({ ok: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/reset-settings', function (req, res) {
if (!req.isMaster && req.tid !== '*') return res.status(403).json({ error: 'master only' });
try {
const tid = req.tid === '*' ? 1 : req.tid;
db.prepare("UPDATE tenant_config SET shop_name='Автозапчасти', slogan='Запчасти для любых китайских авто', hero_url='/images/hero.jpg', color_primary='#667eea', color_accent='#764ba2', payment_text='Оплата переводом на карту', delivery_text='Самовывоз + доставка по городу', car_brands_json='[\"Chery\",\"Haval\",\"Geely\",\"Changan\",\"Omoda\"]', categories_json='[\"Фильтры\",\"Тормоза\",\"Подвеска\",\"Электрика\",\"Кузов\"]', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(tid);
res.json({ ok: true });
} catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
const multer = require('multer');
const XLSX = require('xlsx');
const { sendNotification } = require('../notify');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
router.get('/excel-template', function (req, res) {
try {
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([['article','name','price','stock','category','brand','car_brand','cross_numbers'],['C10011','Пример товара',100,5,'Фильтры','Mann','Chery','OC90, W6109']]);
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
const tid = req.tid === '*' ? 1 : req.tid;
const planRow = db.prepare('SELECT plan FROM tenants WHERE id=?').get(tid);
const L = ({ start: { rows: 3000, mb: 5 }, growth: { rows: 15000, mb: 20 }, pro: { rows: 50000, mb: 50 }, enterprise: { rows: 200000, mb: 50 }, trial: { rows: 3000, mb: 5 } })[(planRow && planRow.plan) || 'trial'] || { rows: 2000, mb: 5 };
if (req.file.size > L.mb * 1024 * 1024) return res.status(400).json({ error: 'file bigger than plan allows' });
let rows;
if (String(req.file.originalname||'').toLowerCase().endsWith('.csv')) {
  let text = req.file.buffer.toString('utf8').replace(/^\uFEFF/,'');
  const firstLine = text.split('\n')[0];
  const delim = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
  const grid = [];
  let cur = [''], field = '', inQ = false;
  for (let q = 0; q < text.length; q++) {
    const ch = text[q];
    if (inQ) { if (ch === '"') { if (text[q+1] === '"') { field += '"'; q++; } else inQ = false; } else field += ch; }
    else { if (ch === '"') inQ = true; else if (ch === delim) { cur.push(field); field = ''; } else if (ch === '\n') { cur.push(field); grid.push(cur); cur = ['']; field = ''; } else if (ch === '\r') {} else field += ch; }
  }
  if (field !== '' || cur.length > 1) { cur.push(field); grid.push(cur); }
  const hdr = grid[0].map(h=>h.trim());
  rows = grid.slice(1).filter(r=>r.some(c=>String(c).trim()!=='')).map(r=>{ const o={}; hdr.forEach((h,k)=>o[h]=String(r[k]||'').trim()); return o; });
} else {
  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
}
if (rows.length > L.rows) return res.status(400).json({ error: 'rows more than plan allows: ' + L.rows });
let inserted = 0, updated = 0;
const errors = [];
db.exec('BEGIN');
rows.forEach(function (r, i) {
const article = String(r.article || '').trim();
const name = String(r.name || '').trim();
const price = Number(String(r.price).replace(/\s/g,'').replace(',','.'));
if (!article) { errors.push({ row: i + 2, error: 'пустой артикул' }); return; }
if (!name || isNaN(price) || price <= 0) { errors.push({ row: i + 2, error: 'некорректные name/price' }); return; }
const stockN = Number(String(r.stock).replace(/\s/g,'').replace(',','.'));
const stock = (r.stock === '' || isNaN(stockN)) ? 0 : stockN;
const category = String(r.category || '').trim() || null;
const brand = String(r.brand || '').trim() || null;
const car_brand = String(r.car_brand || '').trim() || null;
const cross_numbers = String(r.cross_numbers || '').trim() || null;
const ex = db.prepare('SELECT id FROM products WHERE article=? AND tenant_id=?').get(article, tid);
if (ex) { db.prepare('UPDATE products SET name=?, category=?, brand=?, price=?, stock=?, car_brand=?, cross_numbers=? WHERE id=?').run(name, category, brand, price, stock, car_brand, cross_numbers, ex.id); updated++; }
else { db.prepare('INSERT INTO products (article, name, category, brand, price, stock, car_brand, cross_numbers, tenant_id) VALUES (?,?,?,?,?,?,?,?,?)').run(article, name, category, brand, price, stock, car_brand, cross_numbers, tid); inserted++; }
});
db.exec('COMMIT');
if (errors.length) { sendNotification('⚠️ Импорт Excel: ошибок ' + errors.length + ', вставлено ' + inserted + ', обновлено ' + updated); }
res.json({ inserted: inserted, updated: updated, errors: errors });
} catch (e) { try { db.exec('ROLLBACK'); } catch (e2) {} console.error('[import]', e.message); res.status(500).json({ error: e.message }); }
});
router.get('/products/:id', function (req, res) {
try {
if (req.tid === '*') { res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id) || {}); }
else { res.json(db.prepare('SELECT * FROM products WHERE id=? AND tenant_id=?').get(req.params.id, req.tid) || {}); }
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/products/analogs/:id', function (req, res) {
try {
if (req.tid === '*') {
const p = db.prepare('SELECT category, brand, car_brand, price FROM products WHERE id=?').get(req.params.id);
if (!p) return res.json([]);
res.json(db.prepare('SELECT * FROM products WHERE id!=? AND (category=? OR car_brand=?) AND price<=? ORDER BY price ASC LIMIT 10').all(req.params.id, p.category, p.car_brand, p.price));
} else {
const p = db.prepare('SELECT category, brand, car_brand, price FROM products WHERE id=? AND tenant_id=?').get(req.params.id, req.tid);
if (!p) return res.json([]);
res.json(db.prepare('SELECT * FROM products WHERE id!=? AND tenant_id=? AND (category=? OR car_brand=?) AND price<=? ORDER BY price ASC LIMIT 10').all(req.params.id, req.tid, p.category, p.car_brand, p.price));
}
} catch (e) { res.status(500).json({ error: e.message }); }
});
const fs = require('fs');
const BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';
router.get('/backups', function (req, res) {
if (!req.isMaster && req.tid !== '*') return res.status(403).json({ error: 'master only' });
try { res.json({ files: fs.readdirSync(BACKUP_DIR).filter(function (f) { return f.endsWith('.db'); }).sort() }); }
catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/restore', function (req, res) {
if (!req.isMaster && req.tid !== '*') return res.status(403).json({ error: 'master only' });
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
const upl = multer.diskStorage({ destination: function (req, file, cb) { cb(null, '/app/data/uploads'); }, filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')); } });
const up = multer({ storage: upl, limits: { fileSize: 5 * 1024 * 1024 } });
router.post('/upload', up.single('photo'), function (req, res) {
try { if (!req.file) return res.status(400).json({ error: 'no file' }); res.json({ url: '/uploads/' + req.file.filename }); }
catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/config', function (req, res) {
try {
const tid = req.tid === '*' ? 1 : req.tid;
const r = db.prepare('SELECT brand_name, shop_name, slogan, phone, contact_info, about, payment_text, delivery_text, hero_url, color_primary, color_accent, car_brands_json, categories_json, updated_at FROM tenant_config WHERE id=?').get(tid);
const o = r || {};
o.car_brands = JSON.parse(o.car_brands_json || '[]');
o.categories = JSON.parse(o.categories_json || '[]');
delete o.car_brands_json; delete o.categories_json;
const trow = db.prepare('SELECT plan, expires_at FROM tenants WHERE id=?').get(tid);
o.plan = trow ? trow.plan : null;
o.expires_at = trow ? trow.expires_at : null;
res.json(o);
} catch (e) { res.status(500).json({ error: e.message }); }
});
