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

    try {
      await handler(req, res, (error) => {
        nextError = error || null;
      });
    } catch (error) {
      nextError = error;
    }

    return {
      error: nextError,
      res
    };
  }

  async function waitForTask(taskId, targetStatus = 'done', timeoutMs = 2000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const task = agentTaskService.getTask(taskId);
      if (task && task.status === targetStatus) {
        return task;
      }
      if (task && task.status === 'failed' && targetStatus !== 'failed') {
        return task;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    throw new Error(`Task ${taskId} did not reach ${targetStatus}`);
  }

  async function close() {
    closeDatabase();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return {
    db,
    financeService,
    verifyChain,
    financeRoutes,
    agentsRoutes,
    invoke,
    waitForTask,
    getContactId,
    insertBrokenTransactionRow,
    close
  };
}

module.exports = {
  createM5Harness
};
