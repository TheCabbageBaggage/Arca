import { useEffect, useState } from 'react';

export default function ProjectsPage({ token }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authedFetch = (url) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());

  const load = async () => {
    setLoading(true);
    try {
      const data = await authedFetch('/api/v1/projects');
      setProjects(data.projects || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className='module-content'>
      <div className='module-header'><h3>Projects</h3><button onClick={load} disabled={loading}>Refresh</button></div>
      {error && <p className='error'>{error}</p>}
      {loading ? <p>Loading...</p> : (
        <table className='data-table'>
          <thead><tr><th>No</th><th>Name</th><th>Status</th><th>Token Budget</th><th>Created</th></tr></thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.id}>
                <td>{p.project_no}</td>
                <td>{p.name}</td>
                <td>{p.status}</td>
                <td>{p.token_budget}</td>
                <td>{p.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
