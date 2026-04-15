import { useEffect, useMemo, useState } from "react";

const emptyItem = { sku: "", name: "", description: "", unit_of_measure: "EA", valuation_method: "AVERAGE", reorder_threshold: 0 };

export default function InventoryPage({ token }) {
  const [items, setItems] = useState([]);
  const [valuation, setValuation] = useState([]);
  const [movements, setMovements] = useState([]);
  const [tab, setTab] = useState("items");
  const [error, setError] = useState("");
  const [itemForm, setItemForm] = useState(emptyItem);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [receipt, setReceipt] = useState({ quantity: "", unit_cost: "" });
  const [issue, setIssue] = useState({ quantity: "" });
  const [adjustment, setAdjustment] = useState({ quantity: "", reason_code: "", unit_cost: "" });

  const authed = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const loadAll = async () => {
    try {
      setError("");
      const [itemRes, valRes, moveRes] = await Promise.all([
        authed("/api/v1/inventory/items"),
        authed("/api/v1/inventory/valuation"),
        authed("/api/v1/inventory/movements")
      ]);
      setItems(itemRes.items || []);
      setValuation(valRes.valuation || []);
      setMovements(moveRes.movements || []);
    } catch (e) {
      setError(e.message || "Inventory load failed");
    }
  };

  useEffect(() => { loadAll(); }, []);

  const selectedItem = useMemo(() => items.find((it) => String(it.id) === String(selectedItemId)), [items, selectedItemId]);

  const createItem = async (e) => {
    e.preventDefault();
    try {
      await authed("/api/v1/inventory/items", { method: "POST", body: JSON.stringify(itemForm) });
      setItemForm(emptyItem);
      await loadAll();
    } catch (err) { setError(err.message); }
  };

  const patchItem = async (id, payload) => {
    try {
      await authed(`/api/v1/inventory/items/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      await loadAll();
    } catch (err) { setError(err.message); }
  };

  const postMovement = async (endpoint, payload, reset) => {
    try {
      await authed(`/api/v1/inventory/${endpoint}`, { method: "POST", body: JSON.stringify(payload) });
      reset();
      await loadAll();
    } catch (err) { setError(err.message); }
  };

  return (
    <section className="placeholder-card" style={{ display: "grid", gap: 16 }}>
      <h3>Inventory</h3>
      {error ? <p className="error-banner">{error}</p> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          ["items", "Item Master"],
          ["receipt", "Receipt"],
          ["issue", "Issue"],
          ["adjustment", "Adjustment"],
          ["valuation", "Valuation"],
          ["movements", "Movements"]
        ].map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === "items" && (
        <>
          <form onSubmit={createItem} style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
            <input placeholder="SKU" value={itemForm.sku} onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })} required />
            <input placeholder="Name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} required />
            <input placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
            <input placeholder="UoM" value={itemForm.unit_of_measure} onChange={(e) => setItemForm({ ...itemForm, unit_of_measure: e.target.value })} />
            <select value={itemForm.valuation_method} onChange={(e) => setItemForm({ ...itemForm, valuation_method: e.target.value })}><option>AVERAGE</option><option>FIFO</option></select>
            <input type="number" step="0.01" placeholder="Reorder threshold" value={itemForm.reorder_threshold} onChange={(e) => setItemForm({ ...itemForm, reorder_threshold: e.target.value })} />
            <button type="submit">Create</button>
          </form>

          <table><thead><tr><th>SKU</th><th>Name</th><th>Qty</th><th>Avg cost</th><th>Actions</th></tr></thead><tbody>
            {items.map((it) => <tr key={it.id}><td>{it.sku}</td><td>{it.name}</td><td>{it.on_hand_qty}</td><td>{it.avg_unit_cost}</td><td><button type="button" onClick={() => patchItem(it.id, { reorder_threshold: Number(it.reorder_threshold || 0) + 1 })}>+ Reorder</button></td></tr>)}
          </tbody></table>
        </>
      )}

      {tab === "receipt" && (
        <form onSubmit={(e) => { e.preventDefault(); postMovement("receipts", { item_id: Number(selectedItemId), quantity: Number(receipt.quantity), unit_cost: Number(receipt.unit_cost) }, () => setReceipt({ quantity: "", unit_cost: "" })); }} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} required><option value="">Select item</option>{items.map((it) => <option key={it.id} value={it.id}>{it.sku} - {it.name}</option>)}</select>
          <input type="number" step="0.01" placeholder="Quantity" value={receipt.quantity} onChange={(e) => setReceipt({ ...receipt, quantity: e.target.value })} required />
          <input type="number" step="0.01" placeholder="Unit cost" value={receipt.unit_cost} onChange={(e) => setReceipt({ ...receipt, unit_cost: e.target.value })} required />
          <button type="submit">Post receipt</button>
        </form>
      )}

      {tab === "issue" && (
        <form onSubmit={(e) => { e.preventDefault(); postMovement("issues", { item_id: Number(selectedItemId), quantity: Number(issue.quantity) }, () => setIssue({ quantity: "" })); }} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} required><option value="">Select item</option>{items.map((it) => <option key={it.id} value={it.id}>{it.sku} - {it.name}</option>)}</select>
          <input type="number" step="0.01" placeholder="Quantity" value={issue.quantity} onChange={(e) => setIssue({ quantity: e.target.value })} required />
          <button type="submit" disabled={!selectedItem || Number(selectedItem.on_hand_qty || 0) <= 0}>Post issue</button>
        </form>
      )}

      {tab === "adjustment" && (
        <form onSubmit={(e) => { e.preventDefault(); postMovement("adjustments", { item_id: Number(selectedItemId), quantity: Number(adjustment.quantity), reason_code: adjustment.reason_code, unit_cost: adjustment.unit_cost ? Number(adjustment.unit_cost) : undefined }, () => setAdjustment({ quantity: "", reason_code: "", unit_cost: "" })); }} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} required><option value="">Select item</option>{items.map((it) => <option key={it.id} value={it.id}>{it.sku} - {it.name}</option>)}</select>
          <input type="number" step="0.01" placeholder="Quantity delta (+/-)" value={adjustment.quantity} onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })} required />
          <input placeholder="Reason code" value={adjustment.reason_code} onChange={(e) => setAdjustment({ ...adjustment, reason_code: e.target.value })} required />
          <input type="number" step="0.01" placeholder="Unit cost (optional)" value={adjustment.unit_cost} onChange={(e) => setAdjustment({ ...adjustment, unit_cost: e.target.value })} />
          <button type="submit">Post adjustment</button>
        </form>
      )}

      {tab === "valuation" && <table><thead><tr><th>SKU</th><th>Name</th><th>Qty</th><th>Avg cost</th><th>Total value</th></tr></thead><tbody>{valuation.map((v) => <tr key={v.item_id}><td>{v.sku}</td><td>{v.name}</td><td>{v.quantity}</td><td>{v.avg_cost}</td><td>{v.total_value}</td></tr>)}</tbody></table>}
      {tab === "movements" && <table><thead><tr><th>Time</th><th>SKU</th><th>Type</th><th>Qty</th><th>Value</th><th>Reason</th></tr></thead><tbody>{movements.map((m) => <tr key={m.id}><td>{m.created_at}</td><td>{m.sku}</td><td>{m.movement_type}</td><td>{m.quantity}</td><td>{m.total_value}</td><td>{m.reason_code || "-"}</td></tr>)}</tbody></table>}
    </section>
  );
}
