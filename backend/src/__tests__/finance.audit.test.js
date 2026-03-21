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
