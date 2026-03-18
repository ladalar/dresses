const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'dresses.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS dresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT,
    price REAL,
    link TEXT,
    rank INTEGER,
    comments TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

module.exports = db;
