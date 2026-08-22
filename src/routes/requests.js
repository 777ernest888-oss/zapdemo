const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const { sendNotification } = require('../notify');
const DB_PATH = process.env.DB_PATH || '/app/data/parts.db';
const db = new Database(DB_PATH);
router.post('/', (req, res) => {
try {
const vin = req.body.vin, desc = req.body.description, contact = req.body.contact;
if (!desc || !String(desc).trim()) return res.status(400).json({ error: 'description required' });
const r = db.prepare('INSERT INTO requests (type, vin, description, contact) VALUES (?, ?, ?, ?)').run('vin', vin || null, String(desc).trim(), contact || null);
sendNotification('🚗 Новый VIN-запрос #' + r.lastInsertRowid + '\nVIN: ' + (vin || '—') + '\nНужно: ' + String(desc).trim() + '\nКонтакт: ' + (contact || '—'));
res.json({ ok: true, id: r.lastInsertRowid });
} catch (e) { console.error('[requests]', e.message); res.status(500).json({ error: e.message }); }
});
router.get('/', (req, res) => {
try {
res.json(db.prepare('SELECT * FROM requests ORDER BY id DESC LIMIT 50').all());
} catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
