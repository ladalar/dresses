const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'dresses.db');

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS dresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT,
    image_url_2 TEXT,
    image_url_3 TEXT,
    image_url_4 TEXT,
    price REAL,
    link TEXT,
    rank INTEGER,
    comments TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Migrate existing tables that may be missing the extra image columns
const existing = db.pragma("table_info(dresses)").map(c => c.name);
if (!existing.includes('image_url_2')) db.exec('ALTER TABLE dresses ADD COLUMN image_url_2 TEXT');
if (!existing.includes('image_url_3')) db.exec('ALTER TABLE dresses ADD COLUMN image_url_3 TEXT');
if (!existing.includes('image_url_4')) db.exec('ALTER TABLE dresses ADD COLUMN image_url_4 TEXT');

module.exports = db;
