const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const env = require('../config/env');

let db;

function ensureDirectory(filePath) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
}

function openDatabase() {
  if (db) {
    return db;
  }

  ensureDirectory(env.databasePath);
  db = new Database(env.databasePath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  return db;
}

function closeDatabase() {
  if (!db) {
    return;
  }

  db.close();
  db = undefined;
}

module.exports = {
  openDatabase,
  closeDatabase
};
