require('dotenv').config();
const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');
try{require('./bot');}catch(e){console.log('BOT MOD ERR',e.message);}
const db = require('./db');
const products = require('./routes/products');
const requests = require('./routes/requests');
const admin = require('./routes/admin');
const config = require('./routes/config');
const settings = require('./routes/settings');
const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use(function (req, res, next) {
if (req.path.indexOf('/api/') === 0) {
const s = String(req.query.tenant || 'demo');
const row = db.prepare('SELECT id FROM tenants WHERE slug=?').get(s);
req.query.tenant = String(row ? row.id : -1);
}
next();
});
app.use(function(req,res,next){if(/\.html$/.test(req.path))res.setHeader('Cache-Control','no-store');next();});app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static('/app/data/uploads'));
app.use('/api/products', products);
app.use('/api/requests', requests);
app.use('/api/settings', settings);
app.use('/admin', admin);
app.use('/api/config', config);
app.use('/api/register', require('./routes/register'));
app.get('/health', (req, res) => { if ((req.headers.accept||'').indexOf('text/html')>=0) return res.type('html').send('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Health</title></head><body style="font-family:sans-serif;background:#0f172a;color:#22c55e;display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0"><div style="text-align:center"><div style="font-size:64px;font-weight:800">OK</div><div style="font-size:24px;color:#e2e8f0;margin-top:8px">сервер жив</div><div style="font-size:18px;color:#94a3b8;margin-top:4px">'+new Date().toLocaleString('ru-RU')+'</div></div></body></html>'); return res.json({ ok: true, time: new Date().toISOString() }); });
app.listen(process.env.PORT || 3000, () => console.log('API_UP'));
function launchWithRetry(instance, label, delay) {
instance.launch().then(function () { console.log('[' + label + '] connected to Telegram'); })
.catch(function (e) {
console.error('[' + label + '] launch failed (process kept alive), retry in ' + Math.round(delay / 1000) + 's:', e && e.message ? e.message : e);
setTimeout(function () { launchWithRetry(instance, label, Math.min(delay * 2, 60000)); }, delay);
});
}
function safeStop(instance, label, sig) {
try { instance.stop(sig); } catch (e) { console.warn('[' + label + '] stop ignored:', e && e.message ? e.message : e); }
}
if (process.env.BOT_TOKEN) {
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.start((ctx) => {
const t = String(ctx.startPayload || 'demo');
const url = (process.env.MINI_APP_URL || 'https://zap.prostors.ru/') + '?tenant=' + encodeURIComponent(t);
ctx.reply('Добро пожаловать!', Markup.inlineKeyboard([[
Markup.button.webApp('🚗 Открыть приложение', url)
]]));
});
/* single poller lives in src/bot.js */
console.log('[BOT] Telegram bot starting in Long Polling mode (with retry)');
process.once('SIGINT', () => { safeStop(bot, 'BOT', 'SIGINT'); });
process.once('SIGTERM', () => { safeStop(bot, 'BOT', 'SIGTERM'); });
} else {
console.warn('BOT_TOKEN empty - bot skipped');
}
