require('dotenv').config();
const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');
const products = require('./routes/products');
const requests = require('./routes/requests');
const admin = require('./routes/admin');
const settings = require('./routes/settings');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/products', products);
app.use('/api/requests', requests);
app.use('/api/settings', settings);
app.use('/admin', admin);
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
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
bot.start((ctx) => ctx.reply('Добро пожаловать!', Markup.inlineKeyboard([[
Markup.button.webApp('🚗 Открыть приложение', process.env.MINI_APP_URL || 'https://zap.prostors.ru/')
]])));
launchWithRetry(bot, 'BOT', 5000);
console.log('[BOT] Telegram bot starting in Long Polling mode (with retry)');
process.once('SIGINT', () => { safeStop(bot, 'BOT', 'SIGINT'); });
process.once('SIGTERM', () => { safeStop(bot, 'BOT', 'SIGTERM'); });
} else {
console.warn('BOT_TOKEN empty - bot skipped');
}
