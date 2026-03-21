const { openDatabase } = require('../../db/client');
const { hashSystemLogRow, hashTransactionLogRow } = require('./hash');

function loadRows(db, table) {
  if (table === 'transaction_log') {
    return db.prepare('SELECT * FROM transaction_log ORDER BY txn_sequence ASC, id ASC').all();
  }

  if (table === 'system_log') {
    return db.prepare('SELECT * FROM system_log ORDER BY occurred_at ASC, id ASC').all();
  }

  const error = new Error(`Unsupported table: ${table}`);
  error.statusCode = 400;
  throw error;
}

function verifyChain(table, db = openDatabase()) {
  const rows = loadRows(db, table);
  let previousHash = 'GENESIS';
  let chainBreaks = 0;
  let prevHashMismatches = 0;

  for (const row of rows) {
    if ((row.prev_hash || 'GENESIS') !== previousHash) {
      prevHashMismatches += 1;
    }

    const expected = table === 'transaction_log'
      ? hashTransactionLogRow(row)
      : hashSystemLogRow(row);

    if (row.row_hash !== expected) {
      chainBreaks += 1;
    }

    previousHash = row.row_hash;
  }

  return {
    table,
    entries: rows.length,
    chain_breaks: chainBreaks,
    prev_hash_mismatches: prevHashMismatches,
    ok: chainBreaks === 0 && prevHashMismatches === 0
  };
}

module.exports = {
  verifyChain
};
