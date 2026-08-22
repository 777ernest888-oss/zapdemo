require('dotenv').config();
const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');
const products = require('./routes/products');
const requests = require('./routes/requests');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api/products', products);
app.use('/api/requests', requests);
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.listen(process.env.PORT || 3000, () => console.log('API_UP'));
if (process.env.BOT_TOKEN) {
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.start((ctx) => ctx.reply('Добро пожаловать!', Markup.inlineKeyboard([[
Markup.button.webApp('🚗 Открыть приложение', process.env.MINI_APP_URL || 'https://zap.prostors.ru/')
]])));
bot.launch().then(() => console.log('BOT_UP')).catch(e => console.error('BOT_FAIL', e.message));
} else {
console.warn('BOT_TOKEN empty - bot skipped');
}
