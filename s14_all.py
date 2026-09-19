import sqlite3
u=sqlite3.connect('/root/zapdemo/data/parts.db').execute("SELECT hero_url FROM tenant_config WHERE id=1").fetchone()[0]
assert u, 'demo hero_url empty'
h='public/index.html'
s=open(h,encoding='utf-8').read()
old="else{document.getElementById('cta_reg').style.display='none';var t=tilesFor(c.shop_name||c.brand_name);"
new="else{document.getElementById('cta_reg').style.display='none';document.getElementById('cta_shop').textContent='Смотреть товары';var t=tilesFor(c.shop_name||c.brand_name);"
assert old in s,'s10'
s=s.replace(old,new,1)
old=".hero img{width:94%;max-width:430px;height:auto;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.3)}"
new=".hero img{width:94%;max-width:430px;aspect-ratio:4/5;object-fit:cover;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.3)}"
assert old in s,'s12'
s=s.replace(old,new,1)
old="if(c.hero_url){var im=document.getElementById('hero_img');im.src=c.hero_url;im.style.display='';}"
new="var im=document.getElementById('hero_img');im.src=c.hero_url||'"+u+"';im.style.display='';"
assert old in s,'s13'
s=s.replace(old,new,1)
open(h,'w',encoding='utf-8').write(s)
print('S14_OK default='+u)
