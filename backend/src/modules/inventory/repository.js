const crypto = require('crypto');
const { openDatabase } = require('../../db/client');
const { buildRowHash, normalizeDate, periodFromDate, toNumber } = require('../finance/utils');

function tableExists(db, tableName) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(tableName);
  return Boolean(row);
}

function mapItem(row) { if (!row) return null; return { id: row.id, sku: row.sku, name: row.name, description: row.description, unit_of_measure: row.unit_of_measure, valuation_method: row.valuation_method, reorder_threshold: toNumber(row.reorder_threshold, 0), preferred_supplier_id: row.preferred_supplier_id, on_hand_qty: toNumber(row.on_hand_qty, 0), avg_unit_cost: toNumber(row.avg_unit_cost, 0), created_at: row.created_at, updated_at: row.updated_at }; }
function mapMovement(row) { return { id: row.id, item_id: row.item_id, movement_type: row.movement_type, quantity: toNumber(row.quantity, 0), unit_cost: row.unit_cost === null ? null : toNumber(row.unit_cost, 0), total_value: row.total_value === null ? null : toNumber(row.total_value, 0), reference_type: row.reference_type, reference_id: row.reference_id, reason_code: row.reason_code, created_at: row.created_at }; }

class InventoryRepository {
  ensure() { const db = openDatabase(); if (!tableExists(db, 'inventory_items') || !tableExists(db, 'inventory_movements')) { const error = new Error('Missing inventory tables. Run db migrations first.'); error.statusCode = 500; throw error; } return db; }
  nextTxnSequence(db) { const row = db.prepare('SELECT COALESCE(MAX(txn_sequence), 0) AS max_sequence FROM transaction_log').get(); return Number(row?.max_sequence || 0) + 1; }
  insertTransactionLog(db, entry) {
    const prevRow = db.prepare('SELECT row_hash FROM transaction_log ORDER BY txn_sequence DESC, id DESC LIMIT 1').get();
    const prevHash = prevRow?.row_hash || 'GENESIS'; const txnSequence = this.nextTxnSequence(db); const txnId = `txn_${crypto.randomUUID()}`; const postedAt = new Date().toISOString();
    const payload = { txn_id: txnId, txn_sequence: txnSequence, posted_at: postedAt, value_date: entry.value_date, booking_period: entry.booking_period, txn_type: entry.txn_type, document_ref: entry.document_ref || null, description: entry.description, debit_account: entry.debit_account, credit_account: entry.credit_account, amount_net: toNumber(entry.amount_net, 0), tax_rate: 0, tax_amount: 0, amount_gross: toNumber(entry.amount_gross, 0), currency: 'EUR', fx_rate: 1, amount_base_currency: toNumber(entry.amount_gross, 0), cost_center: null, project_id: null, contact_id: null, created_by_type: entry.created_by_type, created_by_id: entry.created_by_id, created_by_name: entry.created_by_name, system_log_id: null, is_storno: 0, storno_of_txn: null, period_locked: 0, prev_hash: prevHash, row_hash: null, nextcloud_path: null };
    payload.row_hash = buildRowHash(payload);
    db.prepare(`INSERT INTO transaction_log (txn_id, txn_sequence, posted_at, value_date, booking_period, txn_type, document_ref, description, debit_account, credit_account, amount_net, tax_rate, tax_amount, amount_gross, currency, fx_rate, amount_base_currency, cost_center, project_id, contact_id, created_by_type, created_by_id, created_by_name, system_log_id, is_storno, storno_of_txn, period_locked, prev_hash, row_hash, nextcloud_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(payload.txn_id, payload.txn_sequence, payload.posted_at, payload.value_date, payload.booking_period, payload.txn_type, payload.document_ref, payload.description, payload.debit_account, payload.credit_account, payload.amount_net, payload.tax_rate, payload.tax_amount, payload.amount_gross, payload.currency, payload.fx_rate, payload.amount_base_currency, payload.cost_center, payload.project_id, payload.contact_id, payload.created_by_type, payload.created_by_id, payload.created_by_name, payload.system_log_id, payload.is_storno, payload.storno_of_txn, payload.period_locked, payload.prev_hash, payload.row_hash, payload.nextcloud_path);
    return payload;
  }
  listItems() { const db = this.ensure(); return db.prepare('SELECT * FROM inventory_items ORDER BY sku ASC, id ASC').all().map(mapItem); }
  getItemById(id) { const db = this.ensure(); return mapItem(db.prepare('SELECT * FROM inventory_items WHERE id = ? LIMIT 1').get(Number(id))); }
  createItem(payload) { const db = this.ensure(); const info = db.prepare(`INSERT INTO inventory_items (sku, name, description, unit_of_measure, valuation_method, reorder_threshold, preferred_supplier_id, on_hand_qty, avg_unit_cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run(payload.sku, payload.name, payload.description || null, payload.unit_of_measure || 'EA', payload.valuation_method || 'AVERAGE', toNumber(payload.reorder_threshold, 0), payload.preferred_supplier_id || null); return this.getItemById(info.lastInsertRowid); }
  updateItem(id, payload) { const existing = this.getItemById(id); if (!existing) return null; const db = this.ensure(); db.prepare(`UPDATE inventory_items SET sku = ?, name = ?, description = ?, unit_of_measure = ?, valuation_method = ?, reorder_threshold = ?, preferred_supplier_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(payload.sku ?? existing.sku, payload.name ?? existing.name, payload.description !== undefined ? payload.description : existing.description, payload.unit_of_measure ?? existing.unit_of_measure, payload.valuation_method ?? existing.valuation_method, payload.reorder_threshold !== undefined ? toNumber(payload.reorder_threshold, 0) : existing.reorder_threshold, payload.preferred_supplier_id !== undefined ? payload.preferred_supplier_id : existing.preferred_supplier_id, Number(id)); return this.getItemById(id); }
  applyMovement(payload, actor, accounting) {
    const db = this.ensure(); const createdBy = { created_by_type: actor?.authType || actor?.type || 'system', created_by_id: actor?.id ? String(actor.id) : 'system', created_by_name: actor?.name || actor?.username || 'system' };
    const tx = db.transaction(() => {
      const item = this.getItemById(payload.item_id); if (!item) { const error = new Error('Item not found'); error.statusCode = 404; throw error; }
      const qty = Math.abs(toNumber(payload.quantity, 0)); const unitCost = payload.unit_cost === undefined || payload.unit_cost === null ? null : toNumber(payload.unit_cost, 0);
      let signedQty = qty; if (payload.movement_type === 'ISSUE') signedQty = -qty; if (payload.movement_type === 'ADJUSTMENT') signedQty = toNumber(payload.quantity, 0);
      const newQty = toNumber(item.on_hand_qty, 0) + signedQty; if (newQty < 0) { const error = new Error('Insufficient stock'); error.statusCode = 409; throw error; }
      const prevAvg = toNumber(item.avg_unit_cost, 0); let nextAvg = prevAvg;
      if (payload.movement_type === 'RECEIPT') { const effectiveCost = toNumber(unitCost, 0); const prevValue = toNumber(item.on_hand_qty, 0) * prevAvg; const receiptValue = qty * effectiveCost; nextAvg = newQty > 0 ? (prevValue + receiptValue) / newQty : 0; }
      if (payload.movement_type === 'ADJUSTMENT' && unitCost !== null && unitCost >= 0) nextAvg = unitCost;
      const movementTotal = payload.movement_type === 'ISSUE' ? qty * prevAvg : Math.abs(signedQty) * toNumber(unitCost ?? nextAvg, 0);
      const movementInfo = db.prepare(`INSERT INTO inventory_movements (item_id, movement_type, quantity, unit_cost, total_value, reference_type, reference_id, reason_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(item.id, payload.movement_type, signedQty, unitCost, movementTotal, payload.reference_type || null, payload.reference_id || null, payload.reason_code || null);
      db.prepare('UPDATE inventory_items SET on_hand_qty = ?, avg_unit_cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, nextAvg, item.id);
      const valueDate = normalizeDate(payload.value_date || new Date().toISOString()); const bookingPeriod = periodFromDate(valueDate);
      const txn = this.insertTransactionLog(db, { ...createdBy, value_date: valueDate, booking_period: bookingPeriod, txn_type: payload.movement_type.toLowerCase(), document_ref: `${payload.movement_type}-${movementInfo.lastInsertRowid}`, description: payload.description || `${payload.movement_type} ${item.sku}`, debit_account: accounting.debit, credit_account: accounting.credit, amount_net: Math.abs(movementTotal), amount_gross: Math.abs(movementTotal) });
      const movement = db.prepare('SELECT * FROM inventory_movements WHERE id = ? LIMIT 1').get(movementInfo.lastInsertRowid);
      return { item: this.getItemById(item.id), movement: mapMovement(movement), transaction_log_id: txn.txn_id };
    });
    return tx();
  }
  listMovements(filters = {}) {
    const db = this.ensure(); const clauses = []; const values = [];
    if (filters.item_id) { clauses.push('m.item_id = ?'); values.push(Number(filters.item_id)); }
    if (filters.from) { clauses.push('date(m.created_at) >= date(?)'); values.push(filters.from); }
    if (filters.to) { clauses.push('date(m.created_at) <= date(?)'); values.push(filters.to); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(`SELECT m.*, i.sku, i.name FROM inventory_movements m JOIN inventory_items i ON i.id = m.item_id ${where} ORDER BY m.created_at DESC, m.id DESC`).all(...values);
    return rows.map((row) => ({ ...mapMovement(row), sku: row.sku, name: row.name }));
  }
  getValuation(asOf) {
    const db = this.ensure(); const cutoff = normalizeDate(asOf || new Date().toISOString()) || new Date().toISOString().slice(0, 10);
    const rows = db.prepare(`SELECT * FROM inventory_valuation WHERE date(updated_at) <= date(?) ORDER BY sku ASC`).all(cutoff);
    return rows.map((row) => ({ item_id: row.item_id, sku: row.sku, name: row.name, quantity: toNumber(row.quantity, 0), avg_cost: toNumber(row.avg_cost, 0), total_value: toNumber(row.total_value, 0), as_of: cutoff }));
  }
}
module.exports = InventoryRepository;
