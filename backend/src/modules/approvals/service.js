const ApprovalsRepository = require("./repository");

class ApprovalsService {
  constructor(repository = new ApprovalsRepository()) {
    this.repository = repository;
  }

  createPolicy(payload = {}) {
    if (!payload.name || !payload.scope || payload.threshold_amount === undefined || !payload.approver_role) {
      const e = new Error("name, scope, threshold_amount, approver_role are required");
      e.statusCode = 400;
      throw e;
    }
    return this.repository.createPolicy({
      name: payload.name,
      scope: payload.scope,
      threshold_amount: Number(payload.threshold_amount),
      cost_center: payload.cost_center || null,
      approver_role: payload.approver_role
    });
  }

  listPolicies() {
    return this.repository.listPolicies();
  }

  updatePolicy(id, patch = {}) {
    const updated = this.repository.updatePolicy(id, patch);
    if (!updated) {
      const e = new Error("Policy not found");
      e.statusCode = 404;
      throw e;
    }
    return updated;
  }

  listRequests(filters = {}) {
    return this.repository.listRequests(filters.status || null);
  }

  approve(id, actor, reason) {
    const request = this.repository.getRequestById(id);
    if (!request) {
      const e = new Error("Request not found");
      e.statusCode = 404;
      throw e;
    }
    if (request.status !== "pending") {
      const e = new Error("Request already decided");
      e.statusCode = 409;
      throw e;
    }
    return this.repository.decideRequest(id, { status: "approved", approver_id: actor?.id || null, reason: reason || null });
  }

  reject(id, actor, reason) {
    const request = this.repository.getRequestById(id);
    if (!request) {
      const e = new Error("Request not found");
      e.statusCode = 404;
      throw e;
    }
    if (request.status !== "pending") {
      const e = new Error("Request already decided");
      e.statusCode = 409;
      throw e;
    }
    return this.repository.decideRequest(id, { status: "rejected", approver_id: actor?.id || null, reason: reason || null });
  }

  getAudit(id) {
    return this.repository.getAudit(id);
  }

  ensureApprovedOrThrow({ scope, amount, cost_center, reference_type, requester_id, reason }) {
    const policy = this.repository.findApplicablePolicy({ scope, amount, cost_center });
    if (!policy || Number(amount) <= Number(policy.threshold_amount || 0)) {
      return null;
    }
    const request = this.repository.createRequest({
      policy_id: policy.id,
      reference_type,
      requester_id,
      reason
    });
    const e = new Error("Approval required by policy");
    e.statusCode = 409;
    e.code = "APPROVAL_POLICY_REQUIRED";
    e.approval_request = request;
    e.policy = policy;
    throw e;
  }
}

module.exports = ApprovalsService;
