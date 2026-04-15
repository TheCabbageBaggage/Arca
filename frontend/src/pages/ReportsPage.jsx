import { useMemo, useState } from "react";

const TABS = [
  { id: "cash-flow", label: "Cash Flow" },
  { id: "budget-vs-actual", label: "Budget vs Actual" },
  { id: "ar-aging", label: "AR Aging" },
  { id: "ap-aging", label: "AP Aging" }
];

export default function ReportsPage({ token }) {
  const [tab, setTab] = useState("cash-flow");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const [asOf, setAsOf] = useState(today);
  const [groupBy, setGroupBy] = useState("department");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runReport = async () => {
    setLoading(true);
    setError("");
    try {
      let url = `/api/v1/reports/${tab}`;
      if (tab === "cash-flow") url += `?from=${from}&to=${to}&method=direct`;
      else if (tab === "budget-vs-actual") url += `?from=${from}&to=${to}&group_by=${groupBy}`;
      else url += `?as_of=${asOf}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message || "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const url = `/api/v1/reports/${tab}/export?format=csv&from=${from}&to=${to}&as_of=${asOf}&group_by=${groupBy}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = `${tab}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      });
  };

  return (
    <section className="placeholder-card">
      <div className="reports-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "sidebar__item is-active" : "sidebar__item"} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="button-row" style={{ marginTop: 12 }}>
        {(tab === "cash-flow" || tab === "budget-vs-actual") ? (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        ) : (
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        )}
        {tab === "budget-vs-actual" ? (
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="department">department</option>
            <option value="project">project</option>
            <option value="cost_center">cost_center</option>
          </select>
        ) : null}
        <button type="button" onClick={runReport} disabled={loading}>{loading ? "Loading..." : "Run"}</button>
        <button type="button" onClick={exportCsv}>Export CSV</button>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}
      {data ? <pre style={{ overflow: "auto", maxHeight: 500 }}>{JSON.stringify(data, null, 2)}</pre> : null}
    </section>
  );
}
