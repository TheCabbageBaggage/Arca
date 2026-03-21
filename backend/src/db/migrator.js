const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { openDatabase, closeDatabase } = require('./client');

const migrationsDir = path.join(__dirname, 'migrations');

function ensureSchemaMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function checksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function readMigrations() {
  return fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((filename) => {
      const filePath = path.join(migrationsDir, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        filename,
        path: filePath,
        content,
        checksum: checksum(content)
      };
    });
}

function getAppliedMigrations(db) {
  ensureSchemaMigrationsTable(db);
  const rows = db.prepare('SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename').all();
  return new Map(rows.map((row) => [row.filename, row]));
}

function applyMigration(db, migration) {
  const insert = db.prepare(
    'INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)'
  );

  const tx = db.transaction(() => {
    db.exec(migration.content);
    insert.run(migration.filename, migration.checksum);
  });

  tx();
}

function migrate() {
  const db = openDatabase();
  ensureSchemaMigrationsTable(db);

  const applied = getAppliedMigrations(db);
  const migrations = readMigrations();
  const pending = migrations.filter((migration) => {
    const existing = applied.get(migration.filename);
    return !existing;
  });

  const modified = migrations.filter((migration) => {
    const existing = applied.get(migration.filename);
    return existing && existing.checksum !== migration.checksum;
  });

  if (modified.length > 0) {
    const names = modified.map((migration) => migration.filename).join(', ');
    throw new Error(`Applied migration(s) changed on disk: ${names}`);
  }

  for (const migration of pending) {
    applyMigration(db, migration);
    // eslint-disable-next-line no-console
    console.log(`Applied ${migration.filename}`);
  }

  return {
    total: migrations.length,
    appliedBeforeRun: migrations.length - pending.length,
    appliedNow: pending.length,
    pendingAfterRun: 0
  };
}

function status() {
  const db = openDatabase();
  ensureSchemaMigrationsTable(db);

  const applied = getAppliedMigrations(db);
  const migrations = readMigrations().map((migration) => ({
    filename: migration.filename,
    checksum: migration.checksum,
    status: applied.has(migration.filename)
      ? (applied.get(migration.filename).checksum === migration.checksum ? 'applied' : 'modified')
      : 'pending',
    applied_at: applied.get(migration.filename)?.applied_at || null
  }));

  return migrations;
}

function runMigrateCli() {
  try {
    const result = migrate();
    // eslint-disable-next-line no-console
    console.log(
      `Done. Applied now: ${result.appliedNow}. Pending after run: ${result.pendingAfterRun}.`
    );
  } finally {
    closeDatabase();
  }
}

function runStatusCli() {
  try {
    const migrations = status();
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(migrations, null, 2));
  } finally {
    closeDatabase();
  }
}

module.exports = {
  migrationsDir,
  migrate,
  status,
  runMigrateCli,
  runStatusCli
};
