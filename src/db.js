const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const dbPath = process.env.DB_PATH || './data/parts.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.exec(fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8'));
module.exports = db;