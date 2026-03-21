import { useEffect, useState } from 'react';

const appStyle = {
  fontFamily: 'Segoe UI, Tahoma, sans-serif',
  margin: '2rem auto',
  maxWidth: '760px',
  padding: '1.5rem',
  border: '1px solid #d9d9d9',
  borderRadius: '12px',
  background: '#ffffff'
};

export default function App() {
  const [health, setHealth] = useState({ loading: true });

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data) => setHealth({ loading: false, data }))
      .catch((error) => setHealth({ loading: false, error: error.message }));
  }, []);

  return (
    <main style={appStyle}>
      <h1>Arca M1 Scaffold</h1>
      <p>Frontend + Nginx + Backend routing is live.</p>
      {health.loading && <p>Checking backend health...</p>}
      {health.data && (
        <pre>{JSON.stringify(health.data, null, 2)}</pre>
      )}
      {health.error && <p style={{ color: 'crimson' }}>Health check failed: {health.error}</p>}
    </main>
  );
}
