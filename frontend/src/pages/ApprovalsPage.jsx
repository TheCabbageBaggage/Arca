import { useEffect, useState } from "react";

export default function ApprovalsPage({ api }) {
  const [policies, setPolicies] = useState([]);
  const [requests, setRequests] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState("");
  const [policyForm, setPolicyForm] = useState({ name: "", scope: "invoice", threshold_amount: "0", approver_role: "finance_manager", cost_center: "" });

  const load = async () => {
    try {
      setError("");
      const [p, r] = await Promise.all([
        api.get("/api/v1/approvals/policies"),
        api.get("/api/v1/approvals/requests?status=pending")
      ]);
      setPolicies(p.policies || []);
      setRequests(r.requests || []);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  const createPolicy = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/approvals/policies", { ...policyForm, threshold_amount: Number(policyForm.threshold_amount) });
      setPolicyForm({ ...policyForm, name: "" });
      await load();
    } catch (e2) { setError(e2.message); }
  };

  const decide = async (id, action) => {
    await api.post(`/api/v1/approvals/requests/${id}/${action}`, {});
    await load();
  };

  const loadAudit = async (id) => {
    const a = await api.get(`/api/v1/approvals/requests/${id}/audit`);
    setAudit(a.audit || []);
  };

  return <section className="placeholder-card"><h3>Approval Management</h3>{error?<p className="error-banner">{error}</p>:null}
    <form className="button-row" onSubmit={createPolicy}>
      <input placeholder="Name" value={policyForm.name} onChange={(e)=>setPolicyForm({...policyForm, name:e.target.value})} />
      <select value={policyForm.scope} onChange={(e)=>setPolicyForm({...policyForm, scope:e.target.value})}><option value="invoice">invoice</option><option value="payment">payment</option><option value="journal">journal</option></select>
      <input type="number" value={policyForm.threshold_amount} onChange={(e)=>setPolicyForm({...policyForm, threshold_amount:e.target.value})} />
      <input placeholder="Approver role" value={policyForm.approver_role} onChange={(e)=>setPolicyForm({...policyForm, approver_role:e.target.value})} />
      <input placeholder="Cost center" value={policyForm.cost_center} onChange={(e)=>setPolicyForm({...policyForm, cost_center:e.target.value})} />
      <button type="submit">Create policy</button>
    </form>
    <h4>Policies</h4><pre>{JSON.stringify(policies, null, 2)}</pre>
    <h4>Pending requests</h4>
    {requests.map((r)=><div key={r.id} className="alert-item"><span>#{r.id} {r.reference_type}</span><span className="button-row"><button onClick={()=>decide(r.id,"approve")}>Approve</button><button onClick={()=>decide(r.id,"reject")}>Reject</button><button onClick={()=>loadAudit(r.id)}>Audit</button></span></div>)}
    <h4>Audit trail</h4><pre>{JSON.stringify(audit, null, 2)}</pre>
  </section>;
}
