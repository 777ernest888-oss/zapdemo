const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const { sendNotification, sendToChat } = require('../notify');
const DB_PATH = process.env.DB_PATH || '/app/data/parts.db';
const db = new Database(DB_PATH);
router.post('/', async (req, res) => {
try {
let t = 1; const tq = String(req.query.tenant || ''); if (tq) { const nn = parseInt(tq); const row = (!isNaN(nn) && nn > 0) ? db.prepare('SELECT id FROM tenants WHERE id=?').get(nn) : db.prepare('SELECT id FROM tenants WHERE slug=?').get(tq); if (!row) return res.status(404).json({ error: 'магазин не найден' }); t = row.id; }
const vin = req.body.vin, desc = req.body.description, contact = String(req.body.contact || '').trim();
let tg=''; const TGX='\n\u2709\uFE0F TG: '; let dd=String(desc).trim(); const ti=dd.indexOf(TGX); if(ti>=0){tg=dd.slice(ti+TGX.length).trim(); dd=dd.slice(0,ti);} if(tg && !/^@[a-zA-Z0-9_]{3,32}$/.test(tg)) return res.status(400).json({ error: 'Telegram: формат @username, 3-32 знака' });
if (!desc || String(desc).trim().length < 2) return res.status(400).json({ error: 'Сообщение: минимум 2 символа' });
const dg0=contact.replace(/\D/g,''); const dgx=(dg0.length===11&&(dg0[0]==='7'||dg0[0]==='8'))?dg0.slice(1):dg0; if(dgx.length!==10) return res.status(400).json({ error: 'Телефон: ровно 11 цифр (+7 XXX XXX-XX-XX)' }); const phone='+7 ('+dgx.slice(0,3)+') '+dgx.slice(3,6)+'-'+dgx.slice(6,8)+'-'+dgx.slice(8,10);

if (vin && !/^[A-Za-z0-9]{6,17}$/.test(String(vin).trim())) return res.status(400).json({ error: 'VIN: 6–17 знаков латиницей и цифрами' });
const r = db.prepare('INSERT INTO requests (type, vin, description, contact, tenant_id, push_status) VALUES (?, ?, ?, ?, ?, ?)').run('vin', vin || null, dd, phone, t, 'pending');
var PFX='📦 Товар: ';var CM='\n💬 Комментарий: ';
var d=dd;var prod='';var note='';
if(d.indexOf(PFX)===0){var bb=d.slice(PFX.length);var ni=bb.indexOf(CM);if(ni>=0){prod=bb.slice(0,ni);note=bb.slice(ni+CM.length);}else{prod=bb;}}
function esc(x){return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
var lines=['📨 <b>Запрос #'+r.lastInsertRowid+'</b>','────────────'];
if(vin)lines.push('🆔 VIN: <code>'+esc(vin)+'</code>');
if(prod)lines.push('📦 '+esc(prod));
note=note.slice(0,30);if(note)lines.push('💬 '+esc(note));
if(!prod&&d)lines.push('📋 '+esc(d.slice(0,100)));
lines.push('\uD83D\uDCF1 '+esc(phone)); if(tg)lines.push('\u2709\uFE0F '+esc(tg));
const txt = lines.join('\n'); let ok1 = false; try { ok1 = await sendNotification(txt); } catch (e) { ok1 = false; }
let ok2 = true; try { const tc = db.prepare('SELECT tg_chat_id FROM tenant_config WHERE id=?').get(t); const pchat = String(process.env.TG_CHAT_ID || ''); if (tc && tc.tg_chat_id && String(tc.tg_chat_id) !== pchat) { ok2 = await sendToChat(tc.tg_chat_id, txt) ? true : false; } } catch (e) { ok2 = false; console.error('[push-tenant]', e.message); }
const ps = (ok1 && ok2) ? 'sent' : 'failed'; db.prepare('UPDATE requests SET push_status=? WHERE id=?').run(ps, r.lastInsertRowid); res.json({ ok: true, id: r.lastInsertRowid, push_status: ps });
} catch (e) { console.error('[requests]', e.message); res.status(500).json({ error: e.message }); }
});
router.get('/', (req, res) => {
try {
let t = 1; const tq2 = String(req.query.tenant || ''); if (tq2) { const nn2 = parseInt(tq2); const row2 = (!isNaN(nn2) && nn2 > 0) ? db.prepare('SELECT id FROM tenants WHERE id=?').get(nn2) : db.prepare('SELECT id FROM tenants WHERE slug=?').get(tq2); if (!row2) return res.status(404).json({ error: 'tenant not found' }); t = row2.id; }
res.json(db.prepare('SELECT * FROM requests WHERE tenant_id=? ORDER BY id DESC LIMIT 50').all(t));
} catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
