const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const DB_PATH = process.env.DB_PATH || '/app/data/parts.db';
const db = new Database(DB_PATH);
const { sendNotification } = require('../notify');
const { sendMail } = require('../mail');
const reg = new Map();
function limited(ip) {
const now = Date.now();
let r = reg.get(ip);
if (!r || now - r.start > 3600000) { r = { start: now, count: 0 }; reg.set(ip, r); }
r.count += 1;
return r.count > 9;
}
db.exec('CREATE TABLE IF NOT EXISTS slug_seq (prefix TEXT PRIMARY KEY, seq INTEGER);');
function genSlug() {
const d = new Date();
const ds = ('0' + d.getDate()).slice(-2) + ('0' + (d.getMonth() + 1)).slice(-2) + String(d.getFullYear());
const row = db.prepare('SELECT seq FROM slug_seq WHERE prefix=?').get(ds);
let n = (row ? row.seq : 0) + 1;
while (db.prepare('SELECT id FROM tenants WHERE slug=?').get(ds + '-' + String(n).padStart(3, '0'))) n++;
db.prepare("INSERT INTO slug_seq (prefix, seq) VALUES (?, ?) ON CONFLICT(prefix) DO UPDATE SET seq=excluded.seq").run(ds, n);
return ds + '-' + String(n).padStart(3, '0');
}
function cleanName(n){var s=String(n||'').replace(/[«»"'']/g,'').replace(/^(ООО|ИП|АО|ЗАО|ПАО)\s+/i,'').trim();return s.length>=2?s:String(n||'').trim();}
function pickTheme(name) {
var n = String(name || '').toLowerCase();
if (n.indexOf('масл') >= 0 || n.indexOf('фильтр') >= 0) return { c1: '#1e3a8a', c2: '#f59e0b', sl: 'Всё в наличии' };
if (n.indexOf('разбор') >= 0 || n.indexOf('контракт') >= 0) return { c1: '#111827', c2: '#f97316', sl: 'Проверенные контрактные детали' };
if (n.indexOf('корей') >= 0 || n.indexOf('hyundai') >= 0 || n.indexOf('kia') >= 0) return { c1: '#0f766e', c2: '#f59e0b', sl: 'Специалисты по корейским авто' };
return { c1: '#667eea', c2: '#764ba2', sl: 'Запчасти с гарантией' };
}
router.post('/', function (req, res) {
try {
if (limited(req.ip)) return res.status(429).json({ error: 'too many registrations, try later' });
const b = req.body || {};
const name = String(b.name || '').trim();
const pass = String(b.password || '');
let phone = String(b.phone || '').trim();
  const tg = String(b.tg || '').trim();
let pd=phone.replace(/\D/g,'');
if(pd.length===10)pd='7'+pd;
else if(pd.length===11&&pd[0]==='8')pd='7'+pd.slice(1);
if(pd.length!==11||pd[0]!=='7')return res.status(400).json({error:'Телефон: введите 11 цифр, например 79991234567 — скобки и пробелы не нужны'});
phone='+7 ('+pd.slice(1,4)+') '+pd.slice(4,7)+'-'+pd.slice(7,9)+'-'+pd.slice(9,11);
  if (tg && !/^@[a-zA-Z0-9_]{4,32}$/.test(tg)) return res.status(400).json({ error: 'Telegram: @username, 4-32 символа' });
const email=String(b.email||'').trim().toLowerCase();
if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email))return res.status(400).json({error:'Почта: проверьте формат адреса, например name@domain.ru'});
if (name.length < 2) return res.status(400).json({ error: 'name too short' });
const npass=require('crypto').randomBytes(6).toString('hex');
const all=db.prepare('SELECT id,slug,contact_phone,contact_tg FROM tenants').all();
const np=phone.replace(/\D/g,'');
const dup=all.find(function(t){return (np&&String(t.contact_phone||'').replace(/\D/g,'')===np)||(tg&&String(t.contact_tg||'').toLowerCase()===tg.toLowerCase());});
if(dup)return res.status(409).json({error:'Магазин с таким телефоном или Telegram уже создан: '+dup.slug+'. Повторная регистрация не нужна.'});
const slug = genSlug();
if (!slug) return res.status(500).json({ error: 'slug gen failed' });
const r = db.prepare("INSERT INTO tenants (name, slug, status, plan, expires_at, contact_phone, contact_tg) VALUES (?,?,?,?,datetime('now','+14 day'),?,?)").run(name, slug, 'active', 'trial', phone, tg);
var th = pickTheme(name);
db.prepare('INSERT INTO tenant_config (id, brand_name, shop_name, phone, contact_info, admin_password_hash, tg_chat_id, color_primary, color_accent, slogan) VALUES (?,?,?,?,?,?,?,?,?,?)').run(r.lastInsertRowid, name, cleanName(name), phone, tg, require('bcryptjs').hashSync(npass,10), '0', th.c1, th.c2, th.sl);
sendNotification('🆕 <b>Новый магазин</b>\n🏷 ' + name + '\n📱 ' + phone + (tg ? '\n✈️ ' + tg : '') + '\n🔗 ' + slug + '\n⏳ триал 14 дней');
res.json({ ok: true, slug: slug, admin: 'https://zap.prostors.ru/admin.html?tenant=' + slug, shop: 'https://zap.prostors.ru/?tenant=' + slug });
} catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/forgot', function(req,res){ try{ var em=String((req.body||{}).email||'').trim().toLowerCase(); var t=db.prepare('SELECT id,slug FROM tenants WHERE lower(contact_email)=?').get(em); if(t){ var tok=require('crypto').randomBytes(16).toString('hex'); db.prepare("INSERT INTO password_resets (token, tenant_id, expires_at) VALUES (?,?,datetime('now','+1 hour'))").run(tok,t.id); sendMail(em,'Восстановление пароля','<p>Ссылка для установки нового пароля (действует 1 час):</p><p><a href="https://zap.prostors.ru/admin.html?tenant='+t.slug+'&reset='+tok+'">Установить новый пароль</a></p><p>Если вы не запрашивали сброс — просто проигнорируйте письмо.</p>').catch(function(e){console.error('MAIL_ERR',e.message);}); } res.json({ok:true}); }catch(e){ res.status(500).json({error:e.message}); } });
router.post('/reset', function(req,res){ try{ var b=req.body||{}; var row=db.prepare("SELECT pr.tenant_id, t.slug FROM password_resets pr JOIN tenants t ON t.id=pr.tenant_id WHERE pr.token=? AND pr.expires_at>datetime('now')").get(String(b.token||'')); if(!row) return res.status(400).json({error:'Ссылка недействительна или истекла'}); var np=String(b.password||''); if(np.length<8) return res.status(400).json({error:'Пароль: минимум 8 символов'}); db.prepare('UPDATE tenant_config SET admin_password_hash=?, admin_password=NULL WHERE id=?').run(require('bcryptjs').hashSync(np,10), row.tenant_id); db.prepare('DELETE FROM password_resets WHERE token=?').run(String(b.token||'')); res.json({ok:true, slug: row.slug}); }catch(e){ res.status(500).json({error:e.message}); } });
module.exports = router;
