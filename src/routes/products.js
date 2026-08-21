const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_PATH || path.join(__dirname, '../data/parts.db'));

// GET /api/products?q=...&category=...&brand=...&limit=...&offset=...
router.get('/', (req, res) => {
  try {
    const { q, category, brand, limit = 20, offset = 0 } = req.query;
   
    let sql = 'SELECT * FROM products WHERE 1=1';
    let params = [];
   
    // Поиск по артикулу или названию
    if (q && q.trim()) {
      sql += ' AND (article LIKE ? OR name LIKE ?)';
      const searchPattern = `%${q.trim()}%`;
      params.push(searchPattern, searchPattern);
    }
   
    // Фильтр по категории
    if (category && category.trim()) {
      sql += ' AND category = ?';
      params.push(category.trim());
    }
   
    // Фильтр по бренду
    if (brand && brand.trim()) {
      sql += ' AND brand = ?';
      params.push(brand.trim());
    }
   
    sql += ' ORDER BY article LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
   
    const stmt = db.prepare(sql);
    const items = stmt.all(...params);
   
    // Получаем общее количество для пагинации
    let countSql = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    let countParams = [];
   
    if (q && q.trim()) {
      countSql += ' AND (article LIKE ? OR name LIKE ?)';
      const searchPattern = `%${q.trim()}%`;
      countParams.push(searchPattern, searchPattern);
    }
   
    if (category && category.trim()) {
      countSql += ' AND category = ?';
      countParams.push(category.trim());
    }
   
    if (brand && brand.trim()) {
      countSql += ' AND brand = ?';
      countParams.push(brand.trim());
    }
   
    const totalStmt = db.prepare(countSql);
    const { total } = totalStmt.get(...countParams);
   
    res.json({
      items,
      total: total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/categories - список категорий
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all();
    res.json(categories.map(c => c.category));
  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/brands - список брендов
router.get('/brands', (req, res) => {
  try {
    const brands = db.prepare('SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL ORDER BY brand').all();
    res.json(brands.map(b => b.brand));
  } catch (error) {
    console.error('[API Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
