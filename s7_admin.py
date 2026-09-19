a='src/routes/admin.js'
s=open(a,encoding='utf-8').read()
old="if (result.ok) { req.tid = result.tid; return next(); }"
new="if (result.ok) { req.tid = result.tid; req.isMaster = (result.tid === '*'); if (result.tid === '*' && rawT) { req.tid = String(tenantId); } return next(); }"
assert old in s, 'mw anchor'
s=s.replace(old,new,1)
old="if (req.tid !== '*') return res.status(403).json({ error: 'master only' });"
new="if (!req.isMaster && req.tid !== '*') return res.status(403).json({ error: 'master only' });"
assert old in s, 'guard anchor'
s=s.replace(old,new)
old="const r = db.prepare('SELECT brand_name, contact_info, phone, about, tg_chat_id, (admin_password IS NOT NULL) AS has_pass FROM tenant_config WHERE id=?').get(tid);\nres.json(r || {});"
new="const r = db.prepare('SELECT brand_name, contact_info, phone, about, tg_chat_id, (admin_password IS NOT NULL) AS has_pass FROM tenant_config WHERE id=?').get(tid) || {};\nr.is_master = (req.isMaster || req.tid === '*') ? 1 : 0;\nres.json(r);"
assert old in s, 'settings anchor'
s=s.replace(old,new,1)
open(a,'w',encoding='utf-8').write(s)
h='public/admin.html'
s=open(h,encoding='utf-8').read()
old='<div style="margin:10px 0;padding:10px;background:#f5f5f5;border-radius:10px">\n<h3>🔄 Откаты</h3>'
new='<div id="otkat" style="margin:10px 0;padding:10px;background:#f5f5f5;border-radius:10px">\n<h3>🔄 Откаты</h3>'
assert old in s, 'otkat anchor'
s=s.replace(old,new,1)
old='classList.toggle("hide",!!x.has_pass);});}'
new='classList.toggle("hide",!!x.has_pass);var ot=document.getElementById(\'otkat\');if(ot)ot.style.display=x.is_master?\'\':\'none\';});}'
assert old in s, 'checkpass anchor'
s=s.replace(old,new,1)
open(h,'w',encoding='utf-8').write(s)
print('S7_ADMIN_OK')
