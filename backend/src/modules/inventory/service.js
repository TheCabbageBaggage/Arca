const InventoryRepository = require('./repository');
const { toNumber } = require('../finance/utils');

class InventoryService {
  constructor(repository = new InventoryRepository()) { this.repository = repository; }
  listItems() { return this.repository.listItems(); }
  getItem(id) { return this.repository.getItemById(id); }

  createItem(payload = {}) {
    const sku = String(payload.sku || '').trim();
    const name = String(payload.name || '').trim();
    if (!sku || !name) { const error = new Error('sku and name are required'); error.statusCode = 400; throw error; }
    return this.repository.createItem(payload);
  }

  updateItem(id, payload = {}) { return this.repository.updateItem(id, payload); }

  receive(payload = {}, actor = null) {
    const itemId = Number(payload.item_id || payload.itemId);
    const quantity = toNumber(payload.quantity, -1);
    const unitCost = toNumber(payload.unit_cost ?? payload.unitCost, -1);
    if (!Number.isInteger(itemId) || itemId <= 0 || quantity <= 0 || unitCost < 0) {
      const error = new Error('item_id, quantity > 0 and unit_cost >= 0 are required'); error.statusCode = 400; throw error;
    }
    return this.repository.applyMovement({ item_id: itemId, movement_type: 'RECEIPT', quantity, unit_cost: unitCost, reference_type: payload.reference_type || payload.referenceType || 'goods_receipt', reference_id: payload.reference_id || payload.referenceId || null, description: payload.description || null }, actor, { debit: '1400', credit: '1600' });
  }

  issue(payload = {}, actor = null) {
    const itemId = Number(payload.item_id || payload.itemId);
    const quantity = toNumber(payload.quantity, -1);
    if (!Number.isInteger(itemId) || itemId <= 0 || quantity <= 0) { const error = new Error('item_id and quantity > 0 are required'); error.statusCode = 400; throw error; }
    return this.repository.applyMovement({ item_id: itemId, movement_type: 'ISSUE', quantity, reference_type: payload.reference_type || payload.referenceType || 'goods_issue', reference_id: payload.reference_id || payload.referenceId || null, description: payload.description || null }, actor, { debit: '5000', credit: '1400' });
  }

  adjust(payload = {}, actor = null) {
    const itemId = Number(payload.item_id || payload.itemId);
    const quantity = toNumber(payload.quantity, Number.NaN);
    const reasonCode = String(payload.reason_code || payload.reasonCode || '').trim();
    if (!Number.isInteger(itemId) || itemId <= 0 || !Number.isFinite(quantity) || !reasonCode) { const error = new Error('item_id, quantity and reason_code are required'); error.statusCode = 400; throw error; }
    const accounting = quantity >= 0 ? { debit: '1400', credit: '7999' } : { debit: '6999', credit: '1400' };
    return this.repository.applyMovement({ item_id: itemId, movement_type: 'ADJUSTMENT', quantity, unit_cost: payload.unit_cost ?? payload.unitCost, reason_code: reasonCode, reference_type: payload.reference_type || payload.referenceType || 'stock_adjustment', reference_id: payload.reference_id || payload.referenceId || null, description: payload.description || `Stock adjustment (${reasonCode})` }, actor, accounting);
  }

  valuation(filters = {}) { return this.repository.getValuation(filters.as_of || filters.asOf || null); }
  movements(filters = {}) { return this.repository.listMovements(filters); }
}

module.exports = InventoryService;
