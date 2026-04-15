import { useEffect, useState } from 'react';

export default function FinancePage({ token }) {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tab, setTab] = useState('invoices');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authedFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());

  const load = async () => {
    setLoading(true);
    try {
      const [inv, pay] = await Promise.all([
        authedFetch('/api/v1/invoices'),
        authedFetch('/api/v1/payments')
      ]);
      setInvoices(inv.invoices || []);
      setPayments(pay.payments || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fmt = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

  return (
    <div className='module-content'>
      <div className='module-header'>
        <h3>Finance</h3>
        <div className='tab-bar'>
          <button className={tab === 'invoices' ? 'active' : ''} onClick={() => setTab('invoices')}>Invoices ({invoices.length})</button>
          <button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Payments ({payments.length})</button>
        </div>
        <button onClick={load} disabled={loading}>Refresh</button>
      </div>
      {error && <p className='error'>{error}</p>}
      {loading ? <p>Loading...</p> : tab === 'invoices' ? (
        <table className='data-table'>
          <thead><tr><th>No</th><th>Partner</th><th>Date</th><th>Due</th><th>Net</th><th>VAT</th><th>Gross</th><th>Status</th><th>RC</th></tr></thead>
          <tbody>
            {invoices.map(i => (
              <tr key={i.id}>
                <td>{i.invoice_no}</td>
                <td>{i.business_partner_name || i.contact_name || '—'}</td>
                <td>{i.invoice_date}</td>
                <td>{i.due_date}</td>
                <td>{fmt(i.subtotal_net)}</td>
                <td>{fmt(i.tax_amount)} {i.reverse_charge ? '(0% RC)' : ''}</td>
                <td>{fmt(i.total_gross)}</td>
                <td>{i.status}</td>
                <td>{i.reverse_charge ? '🔁' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className='data-table'>
          <thead><tr><th>No</th><th>Partner</th><th>Date</th><th>Amount</th><th>Method</th><th>Status</th><th>RC</th></tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td>{p.payment_no}</td>
                <td>{p.business_partner_name || p.contact_name || '—'}</td>
                <td>{p.payment_date}</td>
                <td>{fmt(p.amount)}</td>
                <td>{p.payment_method}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
