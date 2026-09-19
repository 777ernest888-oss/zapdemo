const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || '/app/data/parts.db';
const db = new Database(DB_PATH);
function like(v) { return '%' + String(v).trim() + '%'; }
router.get('/', (req, res) => {
try {
const tenantId = parseInt(req.query.tenant) || 1;
const q = req.query.q, cat = req.query.category, br = req.query.brand, cb = req.query.car_brand;
const limit = parseInt(req.query.limit) || 20;
const offset = parseInt(req.query.offset) || 0;
let sql = 'SELECT * FROM products WHERE tenant_id=?';
let cnt = 'SELECT COUNT(*) AS total FROM products WHERE tenant_id=?';
const p = [tenantId], pc = [tenantId];
if (q) { var toks=String(q).trim().split(/\s+/).filter(Boolean); var grp=toks.map(function(){return '(article LIKE ? OR name LIKE ? OR category LIKE ? OR car_brand LIKE ? OR model LIKE ?)';}).join(' AND '); sql += ' AND '+grp; cnt += ' AND '+grp; toks.forEach(function(t){ p.push(like(t),like(t),like(t),like(t),like(t)); pc.push(like(t),like(t),like(t),like(t),like(t)); }); }
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
const t = parseInt(req.query.tenant) || 1;
res.json(db.prepare('SELECT DISTINCT category AS name FROM products WHERE tenant_id=? AND category IS NOT NULL ORDER BY category').all(t).map(function (r) { return r.name; }));
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/brands', (req, res) => {
try {
const t = parseInt(req.query.tenant) || 1;
res.json(db.prepare('SELECT DISTINCT brand AS name FROM products WHERE tenant_id=? AND brand IS NOT NULL ORDER BY brand').all(t).map(function (r) { return r.name; }));
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/car_brands', (req, res) => {
try {
const t = parseInt(req.query.tenant) || 1;
res.json(db.prepare("SELECT DISTINCT car_brand FROM products WHERE tenant_id=? AND car_brand IS NOT NULL AND car_brand != '' ORDER BY car_brand").all(t).map(function (r) { return r.car_brand; }));
} catch (e) { res.status(500).json({ error: e.message }); }
});
function agr(n){n=String(n||'').toLowerCase();var R='пыльник+шрус:cvb,шрус:cv,фильтр+маслян:fo,фильтр+воздушн:fa,фильтр+салонн:fc,масл+моторн:mo,колодк:bp,диск+тормозн:bd,диск+сцеплен:cd,свеча:sp,катуш:co,амортиз:sh,стойк+стабилиз:sl,опор:sm,шаров:ba,рычаг:ar,сайлент:sb,наконечник+рулев:te,тяг+рулев:tr,подшипник+ступиц:hb,втулк:bu,комплект+сцеплен:ck,цилиндр+сцеплен:cc,насос+водяной:wp,термостат:th,радиатор:rd,вентилятор:fn,двигат:en,мкпп:gm,акпп:ga,рейк:sr,компрессор:ac,насос+гур:ps,генератор:ge,стартер:st,фар:hl,бампер:bm,капот:hd,двер:dr,зеркал:mr,стекло+подъемник:wr,панел:da,замок:lk,датчик:se,провод:wi';var r=R.split(',').map(function(x){var a=x.split(':');return [a[0].split('+'),a[1]];});for(var i=0;i<r.length;i++){var ok=true;for(var j=0;j<r[i][0].length;j++){if(n.indexOf(r[i][0][j])<0){ok=false;break;}}if(ok){var c=r[i][1];if(c==='te'||c==='ar'||c==='sh'){if(/(^|[^а-яё])лев/.test(n))c+='L';else if(/(^|[^а-яё])прав/.test(n))c+='R';}return c;}}return '';}
router.get('/analogs/:id', (req, res) => {
try {
const t = parseInt(req.query.tenant) || 1;
const p = db.prepare('SELECT name, category, car_brand, model, price FROM products WHERE id=? AND tenant_id=?').get(req.params.id, t);
if (!p) return res.json([]);
const cr = db.prepare('SELECT cross_numbers FROM products WHERE id=? AND tenant_id=?').get(req.params.id, t);
const arts = (cr && cr.cross_numbers) ? cr.cross_numbers.split(/[;,;\s]+/).map(function(x){return x.trim();}).filter(Boolean) : [];
let list = [];
if (arts.length) { list = db.prepare('SELECT id, article, name, price, stock, brand, photo_url FROM products WHERE tenant_id=? AND article IN (' + arts.map(function(){return '?';}).join(',') + ') AND id!=? AND stock>0').all(...[t].concat(arts, [req.params.id])); }
const fb = db.prepare('SELECT id, article, name, price, stock, brand, photo_url FROM products WHERE id!=? AND tenant_id=? AND stock>0 AND car_brand IS ? AND model IS ? ORDER BY price ASC LIMIT 200').all(req.params.id, t, p.car_brand, p.model);
const seen = {}; const out = [];
list.concat(fb.filter(function(x){return agr(x.name)===agr(p.name);})).forEach(function(x){ if (!seen[x.id]) { seen[x.id] = 1; out.push(x); } });
res.json(out.slice(0, 6));
} catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
