const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || '/app/data/parts.db';
const db = new Database(DB_PATH);
router.get('/', function (req, res) {
try {
const t = parseInt(req.query.tenant) || 1;
const r = db.prepare('SELECT brand_name, contact_info, phone, about FROM tenant_config WHERE id=?').get(t);
res.json(r || {});
} catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
