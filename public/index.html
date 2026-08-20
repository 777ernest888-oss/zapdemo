<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Автозапчасти</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
body{font-family:system-ui;margin:0;padding:16px;background:#f5f5f5}
.item{background:#fff;border-radius:8px;padding:12px;margin:8px 0}
.price{color:#1a7f3c;font-weight:700}
input{width:100%;padding:10px;font-size:16px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box}
</style>
</head>
<body>
<h1>Автозапчасти</h1>
<input id="q" type="search" placeholder="Артикул или название">
<div id="list"></div>
<script>
const list=document.getElementById('list'),q=document.getElementById('q');let t;
q.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(load,300)});
async function load(){
 const r=await fetch('/api/products?q='+encodeURIComponent(q.value)+'&limit=20');
 const d=await r.json();
 list.innerHTML=d.items.map(p=>'<div class="item"><b>'+p.article+'</b> — '+p.name+'<div class="price">'+p.price+' ₽ · наличие: '+p.stock+'</div></div>').join('')||'<p>Пока пусто</p>';
}
load();
</script>
</body>
</html>
