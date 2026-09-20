const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const dbPath = process.env.DB_PATH || './data/parts.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.exec(fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8'));
try{db.exec('ALTER TABLE products ADD COLUMN avail TEXT');}catch(e){}
db.exec("UPDATE products SET avail='in' WHERE avail IS NULL AND stock>0");
db.exec("UPDATE products SET avail='out' WHERE avail IS NULL AND stock<=0");
module.exports = db;