h='public/index.html'
s=open(h,encoding='utf-8').read()
old="body{margin:0;font-family:system-ui;background:var(--accent)}"
new="body{margin:0;font-family:system-ui;background:linear-gradient(180deg,var(--primary),var(--accent)) fixed}"
assert old in s,'body'
s=s.replace(old,new,1)
old=".hero{background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;text-align:center;padding:12px 10px}"
new=".hero{background:none;color:#fff;text-align:center;padding:12px 10px}"
assert old in s,'hero'
s=s.replace(old,new,1)
open(h,'w',encoding='utf-8').write(s)
print('S9_OK')
