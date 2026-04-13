const test = require('node:test');
const assert = require('node:assert/strict');
const { createM5Harness } = require('./helpers/m5-harness');

test('finance writes produce transaction_log entries and chain verifies', async () => {
  const harness = await createM5Harness();
  const actor = { id: 'u_admin', name: 'Admin', authType: 'jwt' };

  try {
    const contactId = harness.getContactId();

    const invoice = harness.financeService.createInvoice({
      contact_id: contactId,
      issue_date: '2026-03-21',
      due_date: '2026-03-31',
      subtotal_net: 1000,
      tax_rate: 19,
      tax_amount: 190,
      total_gross: 1190,
      description: 'M5 invoice test'
    }, actor);

    const payment = harness.financeService.createPayment({
      contact_id: contactId,
      invoice_id: invoice.id,
      payment_date: '2026-03-22',
      total_amount: 1190,
      amount_net: 1190,
      description: 'M5 payment test'
    }, actor);

    const journal = harness.financeService.createJournalEntry({
      entry_date: '2026-03-22',
      description: 'M5 journal test',
      lines: [
        { side: 'debit', account: '6000', amount: 100 },
        { side: 'credit', account: '1200', amount: 100 }
      ]
    }, actor);

    assert.ok(invoice.transaction_log_id);
    assert.ok(payment.transaction_log_id);
    assert.ok(journal.transaction_log_id);

    const verification = harness.verifyChain('transaction_log', harness.db);
    assert.equal(verification.ok, true);
    assert.ok(verification.entries >= 3);
  } finally {
    await harness.close();
  }
});

test('audit verification detects tampered/broken chain rows', async () => {
  const harness = await createM5Harness();
  const actor = { id: 'u_admin', name: 'Admin', authType: 'jwt' };

  try {
    const contactId = harness.getContactId();

    harness.financeService.createInvoice({
      contact_id: contactId,
      issue_date: '2026-03-21',
      subtotal_net: 100,
      tax_rate: 0,
      tax_amount: 0,
      total_gross: 100,
      description: 'baseline'
    }, actor);

    harness.insertBrokenTransactionRow();

    const verification = harness.verifyChain('transaction_log', harness.db);
    assert.equal(verification.ok, false);
    assert.ok(verification.chain_breaks > 0 || verification.prev_hash_mismatches > 0);
  } finally {
    await harness.close();
  }
});

test('spend approval blocks agent-key payment above threshold', async () => {
  const harness = await createM5Harness();

  try {
    const contactId = harness.getContactId();
    harness.db.prepare(
      `INSERT INTO spend_approval_rules (
        threshold_usd, approver_key_id, scope, auto_approve_usd, notify_human_usd
      ) VALUES (?, ?, ?, ?, ?)`
    ).run(50, 'ak_cfo_01', 'finance:write', 50, 2000);

    assert.throws(
      () => harness.financeService.createPayment({
        contact_id: contactId,
        payment_date: '2026-03-22',
        total_amount: 1250,
        amount_net: 1250,
        description: 'Should require approval'
      }, { id: 'ak_fin_01', keyId: 'ak_fin_01', name: 'Finance Agent', authType: 'agent_key' }),
      (error) => {
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, 'SPEND_APPROVAL_REQUIRED');
        assert.equal(error.approval.operation, 'create_payment');
        assert.equal(error.approval.amount_usd, 1250);
        assert.equal(error.approval.notify_human, false);
        return true;
      }
    );
  } finally {
    await harness.close();
  }
});

test('spend approval auto-approves amounts below or equal auto threshold', async () => {
  const harness = await createM5Harness();

  try {
    const contactId = harness.getContactId();
    harness.db.prepare(
      `INSERT INTO spend_approval_rules (
        threshold_usd, approver_key_id, scope, auto_approve_usd, notify_human_usd
      ) VALUES (?, ?, ?, ?, ?)`
    ).run(50, 'ak_cfo_01', 'finance:write', 50, 2000);

    const payment = harness.financeService.createPayment({
      contact_id: contactId,
      payment_date: '2026-03-22',
      total_amount: 50,
      amount_net: 50,
      description: 'Auto-approved threshold edge'
    }, { id: 'ak_fin_01', keyId: 'ak_fin_01', name: 'Finance Agent', authType: 'agent_key' });

    assert.ok(payment.id);
    assert.equal(payment.total_amount, 50);
  } finally {
    await harness.close();
  }
});

test('finance route creates waiting approval task and approval resumes posting', async () => {
  const harness = await createM5Harness();

  try {
    const contactId = harness.getContactId();
    harness.db.prepare(
      `INSERT INTO spend_approval_rules (
        threshold_usd, approver_key_id, scope, auto_approve_usd, notify_human_usd
      ) VALUES (?, ?, ?, ?, ?)`
    ).run(50, 'ak_cfo_01', 'finance:write', 50, 2000);

    const actor = { id: 'ak_fin_01', keyId: 'ak_fin_01', name: 'Finance Agent', authType: 'agent_key' };
    const blocked = await harness.invoke(harness.financeRoutes.handlers.createPayment, {
      body: {
        contact_id: contactId,
        payment_date: '2026-03-22',
        total_amount: 1250,
        amount_net: 1250,
        description: 'Approval orchestration flow'
      },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(blocked.error, null);
    assert.equal(blocked.res.statusCode, 202);
    assert.equal(blocked.res.body.status, 'waiting_approval');
    assert.ok(blocked.res.body.task_id);

    const waiting = harness.financeService.repository.getPaymentById(1);
    assert.equal(waiting, null);

    const approved = await harness.invoke(harness.agentsRoutes.handlers.approveTask, {
      params: { id: blocked.res.body.task_id },
      body: { approved: true, reason: 'PO verified' },
      user: { id: 'ak_cfo_01', keyId: 'ak_cfo_01', name: 'CFO Agent', authType: 'agent_key' },
      auth: { user: { id: 'ak_cfo_01', keyId: 'ak_cfo_01', name: 'CFO Agent', authType: 'agent_key' } }
    });

    assert.equal(approved.error, null);
    assert.equal(approved.res.statusCode, 200);

    const doneTask = await harness.waitForTask(blocked.res.body.task_id, 'done');
    assert.equal(doneTask.status, 'done');
    assert.equal(doneTask.result.module, 'finance');
    assert.equal(doneTask.result.action, 'create_payment');

    const payments = harness.financeService.repository.listPayments({});
    assert.equal(payments.length, 1);
    assert.equal(payments[0].total_amount, 1250);
  } finally {
    await harness.close();
  }
});

test('finance approval rejection keeps booking unapplied', async () => {
  const harness = await createM5Harness();

  try {
    const contactId = harness.getContactId();
    harness.db.prepare(
      `INSERT INTO spend_approval_rules (
        threshold_usd, approver_key_id, scope, auto_approve_usd, notify_human_usd
      ) VALUES (?, ?, ?, ?, ?)`
    ).run(50, 'ak_cfo_01', 'finance:write', 50, 2000);

    const actor = { id: 'ak_fin_01', keyId: 'ak_fin_01', name: 'Finance Agent', authType: 'agent_key' };
    const blocked = await harness.invoke(harness.financeRoutes.handlers.createPayment, {
      body: {
        contact_id: contactId,
        payment_date: '2026-03-22',
        total_amount: 500,
        amount_net: 500,
        description: 'Reject flow'
      },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(blocked.error, null);
    assert.equal(blocked.res.statusCode, 202);
    assert.equal(blocked.res.body.status, 'waiting_approval');

    const rejected = await harness.invoke(harness.agentsRoutes.handlers.approveTask, {
      params: { id: blocked.res.body.task_id },
      body: { approved: false, reason: 'Budget exceeded' },
      user: { id: 'ak_cfo_01', keyId: 'ak_cfo_01', name: 'CFO Agent', authType: 'agent_key' },
      auth: { user: { id: 'ak_cfo_01', keyId: 'ak_cfo_01', name: 'CFO Agent', authType: 'agent_key' } }
    });

    assert.equal(rejected.error, null);
    assert.equal(rejected.res.statusCode, 200);
    assert.equal(rejected.res.body.status, 'cancelled');

    const payments = harness.financeService.repository.listPayments({});
    assert.equal(payments.length, 0);
  } finally {
    await harness.close();
  }
});
