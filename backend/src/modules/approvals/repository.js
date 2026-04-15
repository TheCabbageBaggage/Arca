const { openDatabase } = require("../../db/client");

class ApprovalsRepository {
  db() {
    return openDatabase();
  }

  createPolicy(payload) {
    const db = this.db();
    const info = db.prepare(
      `INSERT INTO approval_policies (name, scope, threshold_amount, cost_center, approver_role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).run(payload.name, payload.scope, payload.threshold_amount, payload.cost_center || null, payload.approver_role);
    return this.getPolicyById(info.lastInsertRowid);
  }

  listPolicies() {
    return this.db().prepare(`SELECT * FROM approval_policies ORDER BY id DESC`).all();
  }

  getPolicyById(id) {
    return this.db().prepare(`SELECT * FROM approval_policies WHERE id = ?`).get(Number(id)) || null;
  }

  updatePolicy(id, patch) {
    const current = this.getPolicyById(id);
    if (!current) return null;
    const merged = { ...current, ...patch };
    this.db().prepare(
      `UPDATE approval_policies
       SET name = ?, scope = ?, threshold_amount = ?, cost_center = ?, approver_role = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(merged.name, merged.scope, merged.threshold_amount, merged.cost_center || null, merged.approver_role, Number(id));
    return this.getPolicyById(id);
  }

  findApplicablePolicy({ scope, amount, cost_center }) {
    return this.db().prepare(
      `SELECT * FROM approval_policies
       WHERE scope = ? AND threshold_amount <= ? AND (cost_center IS NULL OR cost_center = ?)
       ORDER BY threshold_amount DESC, id ASC
       LIMIT 1`
    ).get(scope, amount, cost_center || null) || null;
  }

  createRequest(payload) {
    const db = this.db();
    const info = db.prepare(
      `INSERT INTO approval_requests (policy_id, reference_type, reference_id, requester_id, status, reason)
       VALUES (?, ?, ?, ?, 'pending', ?)`
    ).run(payload.policy_id, payload.reference_type, payload.reference_id || null, payload.requester_id || null, payload.reason || null);
    const request = this.getRequestById(info.lastInsertRowid);
    this.addAudit(request.id, "created", payload.requester_id || null, payload);
    return request;
  }

  listRequests(status) {
    if (status) {
      return this.db().prepare(`SELECT * FROM approval_requests WHERE status = ? ORDER BY id DESC`).all(status);
    }
    return this.db().prepare(`SELECT * FROM approval_requests ORDER BY id DESC`).all();
  }

  getRequestById(id) {
    return this.db().prepare(`SELECT * FROM approval_requests WHERE id = ?`).get(Number(id)) || null;
  }

  decideRequest(id, { status, approver_id, reason }) {
    this.db().prepare(
      `UPDATE approval_requests
       SET status = ?, decision_at = CURRENT_TIMESTAMP, approver_id = ?, reason = COALESCE(?, reason)
       WHERE id = ?`
    ).run(status, approver_id || null, reason || null, Number(id));
    this.addAudit(id, status, approver_id || null, { reason: reason || null });
    return this.getRequestById(id);
  }

  addAudit(requestId, action, actorId, payload) {
    this.db().prepare(
      `INSERT INTO approval_audit (request_id, action, actor_id, payload)
       VALUES (?, ?, ?, ?)`
    ).run(Number(requestId), action, actorId || null, JSON.stringify(payload || {}));
  }

  getAudit(requestId) {
    return this.db().prepare(`SELECT * FROM approval_audit WHERE request_id = ? ORDER BY id ASC`).all(Number(requestId));
  }
}

module.exports = ApprovalsRepository;
