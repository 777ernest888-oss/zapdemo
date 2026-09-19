p='src/routes/requests.js'
s=open(p,encoding='utf-8').read()
old="const vin = req.body.vin, desc = req.body.description, contact = req.body.contact;\nif (!desc || !String(desc).trim()) return res.status(400).json({ error: 'description required' });"
new="const vin = req.body.vin, desc = req.body.description, contact = String(req.body.contact || '').trim();\nif (!desc || String(desc).trim().length < 2) return res.status(400).json({ error: 'Сообщение: минимум 2 символа' });\nif (!/^@[a-zA-Z0-9_]{4,32}$/.test(contact) && !/^\\+?[0-9][0-9()\\-\\s]{6,18}$/.test(contact)) return res.status(400).json({ error: 'Контакт: телефон +7… или Telegram @username' });\nif (vin && !/^[A-Za-z0-9]{6,17}$/.test(String(vin).trim())) return res.status(400).json({ error: 'VIN: 6–17 знаков латиницей и цифрами' });"
assert old in s,'req anchor'
s=s.replace(old,new,1)
open(p,'w',encoding='utf-8').write(s)
print('S15_OK')
