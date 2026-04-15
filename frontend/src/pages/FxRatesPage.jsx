import { useEffect, useState } from "react";

export default function FxRatesPage({ api }) {
  const [rates, setRates] = useState([]);
  const [form, setForm] = useState({ base_currency: "EUR", quote_currency: "USD", rate: "", effective_date: "" });
  const [asOf, setAsOf] = useState("");
  const [revalue, setRevalue] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const data = await api.get("/api/v1/fx/rates");
      setRates(data.rates || []);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await api.post("/api/v1/fx/rates", { ...form, rate: Number(form.rate) });
      setForm({ ...form, rate: "" });
      await load();
    } catch (err) { setError(err.message); }
  };

  const runRevalue = async () => {
    try {
      const q = asOf ? `?as_of=${asOf}` : "";
      const data = await api.post(`/api/v1/fx/revalue${q}`, {});
      setRevalue(data.revaluation);
    } catch (err) { setError(err.message); }
  };

  return (
    <section className="placeholder-card">
      <h3>FX Rates</h3>
      {error ? <p className="error-banner">{error}</p> : null}
      <form className="button-row" onSubmit={submit}>
        <input placeholder="Base" value={form.base_currency} onChange={(e)=>setForm({...form, base_currency:e.target.value})} />
        <input placeholder="Quote" value={form.quote_currency} onChange={(e)=>setForm({...form, quote_currency:e.target.value})} />
        <input placeholder="Rate" type="number" step="0.000001" value={form.rate} onChange={(e)=>setForm({...form, rate:e.target.value})} />
        <input placeholder="YYYY-MM-DD" value={form.effective_date} onChange={(e)=>setForm({...form, effective_date:e.target.value})} />
        <button type="submit">Add rate</button>
      </form>
      <div className="button-row" style={{ marginTop: 10 }}>
        <input placeholder="Revalue as_of YYYY-MM-DD" value={asOf} onChange={(e)=>setAsOf(e.target.value)} />
        <button type="button" onClick={runRevalue}>Run revalue</button>
      </div>
      {revalue ? <pre>{JSON.stringify(revalue, null, 2)}</pre> : null}
      <table style={{ width:"100%", marginTop: 12 }}><thead><tr><th>Base</th><th>Quote</th><th>Rate</th><th>Effective</th></tr></thead>
        <tbody>{rates.map((r)=><tr key={r.id}><td>{r.base_currency}</td><td>{r.quote_currency}</td><td>{r.rate}</td><td>{r.effective_date}</td></tr>)}</tbody></table>
    </section>
  );
}
