const fs = require('fs');
const os = require('os');
const path = require('path');

function purgeBackendModules() {
  const marker = `${path.sep}backend${path.sep}src${path.sep}`;
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.includes(marker)) {
      delete require.cache[cacheKey];
    }
  }
}

async function createM5Harness() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arca-m5-test-'));
  const dbPath = path.join(tmpDir, 'm5.db');

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = dbPath;
  purgeBackendModules();

  const { migrate } = require('../../db/migrator');
  const { openDatabase, closeDatabase } = require('../../db/client');
  const { financeService } = require('../../modules/finance');
  const { sepaService, sepaRepository } = require('../../modules/sepa');
  const { verifyChain } = require('../../modules/audit');
  const { agentTaskService } = require('../../modules/agents');
  const financeRoutes = require('../../api/finance.routes');
  const agentsRoutes = require('../../api/agents.routes');

  migrate();

  const db = openDatabase();
  db.prepare(
    `INSERT INTO contacts (contact_no, type, name, is_active) VALUES (?, ?, ?, 1)`
  ).run('C-10001', 'debtor', 'Acme Corp');

  function getContactId() {
    const row = db.prepare('SELECT id FROM contacts WHERE contact_no = ? LIMIT 1').get('C-10001');
    return row.id;
  }

  function createTestContact(contactData = {}) {
    const { name = 'Test Contact', iban = null, bic = null } = contactData;
    const contactNo = `C-TEST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const stmt = db.prepare(`
      INSERT INTO contacts (contact_no, type, name, is_active, iban, bic) 
      VALUES (?, ?, ?, 1, ?, ?)
    `);
    
    const result = stmt.run(contactNo, 'debtor', name, iban, bic);
    return result.lastInsertRowid;
  }

  function insertBrokenTransactionRow() {
    const prev = db.prepare('SELECT COALESCE(MAX(txn_sequence), 0) AS max_seq FROM transaction_log').get();
    const nextSeq = Number(prev.max_seq || 0) + 1;

    db.prepare(
      `INSERT INTO transaction_log (
        txn_id, txn_sequence, posted_at, value_date, booking_period, txn_type,
        document_ref, description, debit_account, credit_account, amount_net,
        tax_rate, tax_amount, amount_gross, currency, fx_rate, amount_base_currency,
        created_by_type, created_by_id, created_by_name, period_locked, prev_hash, row_hash
      ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `txn_broken_${nextSeq}`,
      nextSeq,
      '2026-03-21',
      '2026-03',
      'manual',
      `BROKEN-${nextSeq}`,
      'broken row',
      '1200',
      '8400',
      100,
      0,
      0,
      100,
      'EUR',
      1,
      100,
      'system',
      'system',
      'system',
      0,
      'WRONG_PREV',
      'WRONG_HASH'
    );
  }

  function createResponse() {
    return {
      statusCode: 200,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
      send(payload) {
        this.body = payload;
        return this;
      }
    };
  }

  async function invoke(handler, req = {}) {
    const res = createResponse();
    let nextError = null;

    const next = (error) => {
      nextError = error;
    };

    try {
      await handler(req, res, next);
    } catch (error) {
      nextError = error;
    }

    if (nextError) {
      throw nextError;
    }

    return res;
  }

  return {
    db,
    financeService,
    sepaService,
    sepaRepository,
    agentTaskService,
    verifyChain,
    getContactId,
    createTestContact,
    insertBrokenTransactionRow,
    invoke,
    close: () => {
      closeDatabase();
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {
        // ignore cleanup errors
      }
    }
  };
}

module.exports = { createM5Harness };