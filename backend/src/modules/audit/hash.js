const crypto = require('crypto');

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function hashSystemLogRow(row) {
  const payload = [
    row.log_id,
    row.occurred_at,
    row.source_id || '',
    row.action,
    row.summary,
    row.prev_hash || ''
  ].join('|');

  return sha256(payload);
}

function hashTransactionLogRow(row) {
  const payload = [
    row.txn_id,
    row.txn_sequence,
    row.posted_at,
    row.value_date,
    row.booking_period,
    row.txn_type,
    row.document_ref || '',
    row.description,
    row.debit_account,
    row.credit_account,
    row.amount_net,
    row.tax_rate,
    row.tax_amount,
    row.amount_gross,
    row.currency,
    row.fx_rate,
    row.amount_base_currency,
    row.cost_center || '',
    row.contact_id || '',
    row.created_by_type,
    row.created_by_id,
    row.created_by_name,
    row.prev_hash || ''
  ].join('|');

  return sha256(payload);
}

module.exports = {
  hashSystemLogRow,
  hashTransactionLogRow
};
