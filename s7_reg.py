p='src/routes/register.js'
s=open(p,encoding='utf-8').read()
old="const contact = String(b.contact || '').trim();"
new=old+"\nif (!/^@[a-zA-Z0-9_]{4,32}$/.test(contact) && !/^\\+?[0-9][0-9()\\-\\s]{6,18}$/.test(contact)) return res.status(400).json({ error: 'Контакт: телефон +7… или Telegram @username' });"
assert old in s, 'contact anchor'
s=s.replace(old,new,1)
old="function genSlug() {\nconst d = new Date();\nconst ds = ('0' + d.getDate()).slice(-2) + ('0' + (d.getMonth() + 1)).slice(-2) + String(d.getFullYear());\nfor (let i = 1; i <= 10; i++) {\nconst cnt = db.prepare(\"SELECT COUNT(*) c FROM tenants WHERE slug LIKE ?\").get(ds + '-%').c;\nconst slug = ds + '-' + String(cnt + i).padStart(3, '0');\nif (!db.prepare('SELECT id FROM tenants WHERE slug=?').get(slug)) return slug;\n}\nreturn null;\n}"
new="db.exec('CREATE TABLE IF NOT EXISTS slug_seq (prefix TEXT PRIMARY KEY, seq INTEGER);');\nfunction genSlug() {\nconst d = new Date();\nconst ds = ('0' + d.getDate()).slice(-2) + ('0' + (d.getMonth() + 1)).slice(-2) + String(d.getFullYear());\nconst row = db.prepare('SELECT seq FROM slug_seq WHERE prefix=?').get(ds);\nlet n = (row ? row.seq : 0) + 1;\nwhile (db.prepare('SELECT id FROM tenants WHERE slug=?').get(ds + '-' + String(n).padStart(3, '0'))) n++;\ndb.prepare(\"INSERT INTO slug_seq (prefix, seq) VALUES (?, ?) ON CONFLICT(prefix) DO UPDATE SET seq=excluded.seq\").run(ds, n);\nreturn ds + '-' + String(n).padStart(3, '0');\n}"
assert old in s, 'genSlug anchor'
s=s.replace(old,new,1)
old="sendNotification('🆕 Саморегистрация: ' + name + ' / ' + slug);"
new="sendNotification('🆕 <b>Новый магазин</b>\\n🏷 ' + name + '\\n📱 ' + (contact || '—') + '\\n🔗 ' + slug + '\\n⏳ триал 14 дней');"
assert old in s, 'push anchor'
s=s.replace(old,new,1)
open(p,'w',encoding='utf-8').write(s)
c='public/catalog.html'
s=open(c,encoding='utf-8').read()
old='Ничего не найдено'
new='Ничего не найдено. В новом магазине товары появятся после загрузки прайса'
assert old in s, 'empty anchor'
s=s.replace(old,new,1)
open(c,'w',encoding='utf-8').write(s)
print('S7_REG_OK')
