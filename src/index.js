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
async function launchWithRetry(bot, retries, delay) {
retries = retries || 3;
delay = delay || 5000;
for (let i = 1; i <= retries; i++) {
try {
await bot.launch();
console.log('BOT_UP');
return;
} catch (e) {
console.error('BOT_LAUNCH_FAIL attempt ' + i + '/' + retries + ': ' + e.message);
if (i < retries) await new Promise(function (r) { setTimeout(r, delay); });
}
}
console.error('BOT_LAUNCH_FAIL all retries exhausted');
process.exit(1);
}
if (process.env.BOT_TOKEN) {
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.start((ctx) => ctx.reply('Добро пожаловать!', Markup.inlineKeyboard([[
Markup.button.webApp('🚗 Открыть приложение', process.env.MINI_APP_URL || 'https://zap.prostors.ru/')
]])));
launchWithRetry(bot);
} else {
console.warn('BOT_TOKEN empty - bot skipped');
}
