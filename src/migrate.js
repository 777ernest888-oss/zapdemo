const Database=require('better-sqlite3');
const bcrypt=require('bcryptjs');
const db=new Database(process.env.DB_PATH||'/app/data/parts.db');
try{db.exec('ALTER TABLE tenants ADD COLUMN contact_email TEXT');}catch(e){}
try{db.exec('CREATE TABLE IF NOT EXISTS password_resets(token TEXT PRIMARY KEY, tenant_id INTEGER, expires_at TEXT);');}catch(e){}
try{db.exec('ALTER TABLE tenant_config ADD COLUMN admin_password_hash TEXT');}catch(e){}
const rows=db.prepare('SELECT id,admin_password FROM tenant_config WHERE admin_password IS NOT NULL').all();
rows.forEach(function(r){if(!String(r.admin_password).startsWith('$2')){db.prepare('UPDATE tenant_config SET admin_password_hash=?, admin_password=NULL WHERE id=?').run(bcrypt.hashSync(String(r.admin_password),10),r.id);}});
console.log('MIGRATE_OK hashed:'+rows.length);
