import { useEffect, useState } from 'react';

export default function DocumentsPage({ token }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authedFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());

  const load = async () => {
    setLoading(true);
    try {
      const data = await authedFetch('/api/v1/documents');
      setDocuments(data.documents || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className='module-content'>
      <div className='module-header'><h3>Documents</h3><button onClick={load} disabled={loading}>Refresh</button></div>
      {error && <p className='error'>{error}</p>}
      {loading ? <p>Loading...</p> : (
        <table className='data-table'>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th></tr></thead>
          <tbody>
            {documents.map(d => (
              <tr key={d.id}>
                <td>{d.filename || d.name}</td>
                <td>{d.mime_type}</td>
                <td>{d.file_size}</td>
                <td>{d.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
