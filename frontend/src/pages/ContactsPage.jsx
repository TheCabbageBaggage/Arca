import { useEffect, useState } from 'react';

export default function ContactsPage({ token }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authedFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());

  const load = async () => {
    setLoading(true);
    try {
      const data = await authedFetch('/api/v1/contacts');
      setContacts(data.contacts || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className='module-content'>
      <div className='module-header'>
        <h3>Contacts</h3>
        <button onClick={load} disabled={loading}>Refresh</button>
      </div>
      {error && <p className='error'>{error}</p>}
      {loading ? <p>Loading...</p> : (
        <table className='data-table'>
          <thead><tr><th>No</th><th>Name</th><th>Email</th><th>Type</th><th>Status</th></tr></thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id}>
                <td>{c.contact_no}</td>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.type}</td>
                <td>{c.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
