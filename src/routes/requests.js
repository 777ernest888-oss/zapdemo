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
var PFX='📦 Товар: ';var CM='\n💬 Комментарий: ';
var d=String(desc).trim();var prod='';var note='';
if(d.indexOf(PFX)===0){var bb=d.slice(PFX.length);var ni=bb.indexOf(CM);if(ni>=0){prod=bb.slice(0,ni);note=bb.slice(ni+CM.length);}else{prod=bb;}}
function esc(x){return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
var lines=['📨 <b>Запрос #'+r.lastInsertRowid+'</b>','────────────'];
if(vin)lines.push('🆔 VIN: <code>'+esc(vin)+'</code>');
if(prod)lines.push('📦 '+esc(prod));
if(note)lines.push('💬 '+esc(note));
if(!prod&&d)lines.push('📋 '+esc(d));
lines.push('📱 '+esc(contact||'—'));
sendNotification(lines.join('\n'));
res.json({ ok: true, id: r.lastInsertRowid });
} catch (e) { console.error('[requests]', e.message); res.status(500).json({ error: e.message }); }
});
router.get('/', (req, res) => {
try {
res.json(db.prepare('SELECT * FROM requests ORDER BY id DESC LIMIT 50').all());
} catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
