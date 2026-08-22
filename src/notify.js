async function sendNotification(text) {
try {
const token = process.env.BOT_TOKEN;
const chat = process.env.TG_CHAT_ID;
if (!token || !chat) { console.warn('[notify] no token/chat'); return false; }
const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ chat_id: chat, text: text })
});
if (!r.ok) console.error('[notify] http', r.status);
return r.ok;
} catch (e) { console.error('[notify]', e.message); return false; }
}
module.exports = { sendNotification };
