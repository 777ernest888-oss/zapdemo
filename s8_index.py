h='public/index.html'
s=open(h,encoding='utf-8').read()
old="body{margin:0;font-family:system-ui;background:#f5f5f5}"
new="body{margin:0;font-family:system-ui;background:var(--accent)}"
assert old in s,'css'
s=s.replace(old,new,1)
old='<a class="cta" id="cta_shop" href="catalog.html?v=14">Смотреть товары</a>'
new='<a class="cta" id="cta_shop" href="catalog.html?v=14">Смотреть демо-версию<br>интернет-магазина Автозапчастей</a>'
assert old in s,'cta_shop'
s=s.replace(old,new,1)
old='<a class="cta" id="cta_reg" style="background:#22c55e" href="register.html">Создать интернет-магазин Автозапчастей</a>'
new='<a class="cta" id="cta_reg" style="background:#22c55e" href="register.html">Создать свой<br>интернет-магазин Автозапчастей</a>'
assert old in s,'cta_reg'
s=s.replace(old,new,1)
old="document.getElementById('cta_shop').textContent='Демо-магазин Автозапчастей';"
new="document.getElementById('cta_shop').innerHTML='Смотреть демо-версию<br>интернет-магазина Автозапчастей';"
assert old in s,'demo js'
s=s.replace(old,new,1)
open(h,'w',encoding='utf-8').write(s)
print('S8_OK')
