const express = require('express');
const db = require('../db');
const router = express.Router();
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
router.get('/', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const where = []; const params = [];
    if (q) { where.push('(article LIKE ? OR name LIKE ?)'); params.push('%' + q + '%', '%' + q + '%'); }
    if (req.query.category) { where.push('category = ?'); params.push(req.query.category); }
    if (req.query.brand) { where.push('brand = ?'); params.push(req.query.brand); }
    const pmin = num(req.query.price_min); const pmax = num(req.query.price_max);
    if (pmin !== null) { where.push('price >= ?'); params.push(pmin); }
    if (pmax !== null) { where.push('price <= ?'); params.push(pmax); }
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 24, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = db.prepare('SELECT COUNT(*) AS c FROM products ' + w).get(...params).c;
    const items = db.prepare('SELECT id, article, name, category, brand, price, stock, photo_url FROM products ' + w + ' ORDER BY id DESC LIMIT ? OFFSET ?').all(...params, limit, offset);
    res.json({ total, limit, offset, items });
  } catch (e) { res.status(500).json({ error: 'db_error', message: e.message }); }
});
router.get('/facets', (req, res) => {
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all().map(r => r.category);
  const brands = db.prepare('SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL ORDER BY brand').all().map(r => r.brand);
  const price = db.prepare('SELECT MIN(price) AS min, MAX(price) AS max FROM products').get();
  res.json({ categories, brands, price_min: price.min, price_max: price.max });
});
router.get('/:id', (req, res) => {
  const id = num(req.params.id);
  if (id === null) return res.status(400).json({ error: 'bad_id' });
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(row);
});
module.exports = router
