if(!process.env.BOT_TOKEN){console.log('BOT SKIP: no token');}else{(function(){
const {Telegraf,Markup}=require('telegraf');
const Database=require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const db=new Database(process.env.DB_PATH||'/app/data/parts.db');
db.exec("CREATE TABLE IF NOT EXISTS outreach(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT UNIQUE, status TEXT DEFAULT 'not_started', phone_type TEXT DEFAULT 'mobile', source TEXT, campaign TEXT, segment TEXT, note TEXT, created_at TEXT DEFAULT (datetime('now')), last_touch TEXT)");
const TEXT_A='Здравствуйте!\nВижу, что вы профессионально занимаетесь продажей запчастей для авто.\nМы готовы за один день запустить для вас работающий интернет-магазин в Telegram и вебе.\nИнтеграция с вашей базой и сайтом. Всё настроим под ваш бренд сами: загрузим прайс из Excel, подключим уведомления.\nЦена: 2490 ₽/мес.\n\nСкиньте ваш прайс-лист в ответном сообщении — я настрою и бесплатно покажу демо магазина прямо на ваших деталях!';
const ST=['not_started','contacted','sent_wa','sent_tg','sent_sms','sent_vk','called','needcall','silent','later_7','dialog','demo','rejected','converted','bad'];
const SDESC={'not_started':'в очереди, не тронут','contacted':'карточка на руках, не отправлено','sent_wa':'отправлено в WhatsApp','sent_tg':'отправлено в Telegram','sent_sms':'отправлено SMS','called':'дозвон состоялся','needcall':'звонить/SMS (нет в мессенджерах)','silent':'нет ответа 24ч+','later_7':'не сейчас, догрев день 8','dialog':'в диалоге (да/вопросы)','demo':'демо запрошено или отправлено','converted':'победа (оплата)','rejected':'отказ (opt-out)','bad':'номер мёртв','sent_vk':'отправлено в VK'};
function auth(ctx){return process.env.OWNER_TG_ID!==''&&String((ctx.from||{}).id||'')===String(process.env.OWNER_TG_ID);}
function card(r){return (r.name||'')+'\nТелефон: '+(r.phone||'')+'\nСегмент: '+(r.segment||'')+' | '+(r.note||'')+'\nИсточник: '+(r.source||'')+'\n\n--- ТЕКСТ ДЛЯ ОТПРАВКИ ---\n'+TEXT_A;}
const bot=new Telegraf(process.env.BOT_TOKEN);
bot.start(c=>auth(c)?c.reply('🤖 Пульт outreach (только владелец)\n/next — следующий из общей очереди\n/nextt — следующий из волны wave1\n/status <телефон> <статус> — пометить контакт\n/stats — полный отчёт по базе и воронке\n/calls — очередь обзвона (needcall)\n/who <статус> — список контактов со статусом\n\nСтатусы:\n'+ST.map(function(s){return s+' — '+SDESC[s];}).join('\n'),{reply_markup:{inline_keyboard:[[{text:'админка',web_app:{url:'https://zap.prostors.ru/admin.html?tenant=demo'}}],[{text:'приложение',web_app:{url:'https://zap.prostors.ru/?tenant=demo'}}]]}}):c.reply('🔒 Пульт только для владельца платформы.\nВладельцам магазинов: восстановление доступа — /recover'));
const recovPick=new Map();
function issue(c,t){var npass=require('crypto').randomBytes(6).toString('hex');db.prepare('UPDATE tenant_config SET admin_password=? WHERE id=?').run(npass,t.id);return c.reply('🔑 '+t.name+'\nКод магазина: '+t.slug+'\nАдминка: https://zap.prostors.ru/admin.html?tenant='+t.slug+'\nВременный пароль: <code>'+npass+'</code>\nСмените его в Настройках после входа.',{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'📋 Скопировать пароль',copy_text:{text:npass}}]]}}).catch(function(){return c.reply('🔑 '+t.name+'\nКод магазина: '+t.slug+'\nАдминка: https://zap.prostors.ru/admin.html?tenant='+t.slug+'\nВременный пароль: '+npass+'\nСмените его в Настройках после входа.');});}
bot.command('recover',function(c){var un=String((c.from.username||'')).toLowerCase();if(!un)return c.reply('Для восстановления нужен Telegram-username: включите его в настройках Telegram.');var all=db.prepare('SELECT id,slug,name,contact_tg FROM tenants').all();var mine=all.filter(function(t){return String(t.contact_tg||'').replace(/^@/,'').toLowerCase()===un;});if(!mine.length)return c.reply('Магазинов, привязанных к этому Telegram, не найдено. Восстановление по почте появится вместе с email-регистрацией; пока — через поддержку.');if(mine.length===1)return issue(c,mine[0]);recovPick.set(String((c.from||{}).id||''),mine.map(function(t){return t.slug;}));return c.reply('Нашёл несколько магазинов у этого Telegram:\n'+mine.map(function(t,q){return (q+1)+'. '+t.name+' — код '+t.slug;}).join('\n')+'\nОтветьте цифрой (номер из списка) или кодом магазина, либо /cancel');});
bot.on('text',function(c,next){var k=String((c.from||{}).id||'');if(!recovPick.has(k))return next();var want=String(c.message.text||'').trim();if(want==='/cancel'){recovPick.delete(k);return c.reply('Отменено.');}var list=recovPick.get(k);var pick=null;if(/^[0-9]+$/.test(want)&&Number(want)>=1&&Number(want)<=list.length)pick=list[Number(want)-1];else if(list.indexOf(want)>=0)pick=want;var t=null;var all=db.prepare('SELECT id,slug,name FROM tenants').all();for(var q=0;q<all.length;q++){if(all[q].slug===pick){t=all[q];break;}}if(!t)return c.reply('Не нашёл такой slug в вашем списке. Попробуйте ещё раз или /cancel');recovPick.delete(k);return issue(c,t);});
function take(ctx,where){try{const r=db.prepare("SELECT * FROM outreach WHERE status='not_started' AND "+where+" ORDER BY id LIMIT 1").get();if(!r)return ctx.reply('Очередь пуста.');db.prepare("UPDATE outreach SET status='contacted', last_touch=datetime('now') WHERE id=?").run(r.id);return ctx.reply(card(r));}catch(e){return ctx.reply('DB ERR '+e.message);}}
bot.command('next',c=>auth(c)?take(c,'1=1'):c.reply('нет доступа'));
bot.command('nextt',c=>auth(c)?take(c,"campaign='wave1'"):c.reply('нет доступа'));
bot.command('status',c=>{if(!auth(c))return c.reply('нет доступа');const p=(c.message.text||'').split(/\s+/);if(p.length<3||ST.indexOf(p[2])<0)return c.reply('Формат: /status <телефон> <статус>\n'+ST.map(function(s){return s+' — '+SDESC[s];}).join('\n'));const res=db.prepare("UPDATE outreach SET status=?, last_touch=datetime('now') WHERE phone=?").run(p[2],p[1]);return c.reply(res.changes?'Помечено: '+p[1]+' -> '+p[2]:'Не найден телефон '+p[1]);});
bot.command('status',c=>{if(!auth(c))return c.reply('нет доступа');const p=(c.message.text||'').split(/\s+/);if(p.length<3||ST.indexOf(p[2])<0)return c.reply('Формат: /status 7999... '+ST.join('|'));const res=db.prepare("UPDATE outreach SET status=?, last_touch=datetime('now') WHERE phone=?").run(p[2],p[1]);return c.reply(res.changes?'Помечено: '+p[1]+' -> '+p[2]:'Не найден телефон '+p[1]);});
bot.on('document',c=>auth(c)?c.reply('Прайс принят. Настрою вручную в течение дня и пришлю демо.'):c.reply('нет доступа'));
bot.use((ctx,next)=>{console.log('TG UPDATE',ctx.updateType,String((ctx.from||{}).id));return next();});
bot.command('calls',function(ctx){if(!auth(ctx))return ctx.reply('нет доступа');var rs=db.prepare("SELECT name,phone FROM outreach WHERE status='needcall' ORDER BY id LIMIT 20").all();if(!rs.length)return ctx.reply('Очередь обзвона пуста.');return ctx.reply(rs.map(function(r){return (r.name||'')+' '+(r.phone||'');}).join('\n'));});
bot.command('stats',function(ctx){if(!auth(ctx))return ctx.reply('нет доступа');var m={},tot=0;db.prepare('SELECT status,COUNT(*) c FROM outreach GROUP BY status').all().forEach(function(r){m[r.status]=(m[r.status]||0)+r.c;tot+=r.c;});var camp=db.prepare('SELECT campaign,COUNT(*) c FROM outreach GROUP BY campaign').all().map(function(r){return (r.campaign||'без кампании')+'='+r.c;}).join(', ');var t=(m.sent_wa||0)+(m.sent_tg||0)+(m.sent_sms||0)+(m.sent_vk||0)+(m.called||0);var den=t-(m.bad||0);var o=['📊 Отчёт outreach','Всего в базе: '+tot+' | по кампаниям: '+camp,'Обработано: '+(tot-(m.not_started||0))+' из '+tot,'В очереди: '+(m.not_started||0)+' | на руках: '+(m.contacted||0)+' | обзвон: '+(m.needcall||0),'Касаний: '+t+' | ждут ответа: '+((m.silent||0)+(m.later_7||0)),'Тёплых: '+((m.dialog||0)+(m.demo||0))+' | побед: '+(m.converted||0)+' | отказов: '+(m.rejected||0)+' | bad: '+(m.bad||0),'Конверсия: '+(den>0?Math.round(100*(m.converted||0)/den)+'%':'—')+' (победы / (касания − bad))','— по статусам —'];ST.forEach(function(s){o.push(s+' — '+SDESC[s]+': '+(m[s]||0));});ctx.reply(o.join('\n'));});
bot.command('who',c=>{if(!auth(c))return c.reply('нет доступа');var s=(c.message.text||'').split(/\s+/)[1];if(ST.indexOf(s)<0)return c.reply('/who <статус>: '+ST.join('|'));var r=db.prepare('SELECT name,phone FROM outreach WHERE status=? ORDER BY id LIMIT 20').all(s);return c.reply(r.length?s+' ('+r.length+'):\n'+r.map(function(x){return (x.name||'—')+' '+x.phone;}).join('\n'):s+': пусто.');});
bot.catch(e=>console.log('BOT CATCH',e.message));
var first=true;

bot.command('backup', async c => {
  if (!auth(c)) return c.reply('нет доступа');
  const dir = '/app/backups'; // Путь внутри контейнера (mount /root/zapdemo/backups:/app/backups:ro)
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.tar.gz.enc')).sort();
    if (!files.length) return c.reply('Нет .enc файлов в backups');
    const latest = files[files.length - 1];
    const fullpath = path.join(dir, latest);
    await c.replyWithDocument({ source: fullpath }, { caption: '\ud83d\udd12 Offsite Backup\n' + latest + '\nКлюч: BACKUP_KEY в .env' });
  } catch(e) {
    console.error('[BACKUP_CMD]', e);
    c.reply('Ошибка чтения бэкапа: ' + e.message);
  }
});

bot.command('links',c=>{if(!auth(c))return c.reply('Нет доступа');return c.reply('Адреса — тапни:',Markup.inlineKeyboard([[Markup.button.url('Админка','https://zap.prostors.ru/admin.html?tenant=demo')],[Markup.button.url('Каталог','https://zap.prostors.ru/catalog.html?tenant=demo')],[Markup.button.url('Лендинг','https://zap.prostors.ru/?tenant=demo')],[Markup.button.url('Health (жив ли сервер)','https://zap.prostors.ru/health')]]));});
function start(){var d=first;first=false;bot.launch({dropPendingUpdates:d}).then(()=>console.log('BOT STOPPED')).catch(function(e){console.log('BOT ERR',e.message);setTimeout(start,5000);});}
console.log('BOT LAUNCH CALLED');
start();
process.once('SIGTERM',function(){try{bot.stop('SIGTERM');}catch(e){}});
process.once('SIGINT',function(){try{bot.stop('SIGINT');}catch(e){}});
})();}
