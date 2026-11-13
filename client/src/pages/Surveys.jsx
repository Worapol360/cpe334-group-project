import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api, ApiError } from '../api.js';

export default function Surveys() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSurveys() {
      try {
        setLoading(true);
        setError(null);
        const data = await api('/api/surveys');
        if (active) {
          setSurveys(Array.isArray(data?.surveys) ? data.surveys : []);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load surveys');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSurveys();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <h1>Published surveys</h1>

        {loading && <p data-testid="loading">Loading surveys…</p>}

        {error && (
          <div
            data-testid="error-message"
            role="alert"
            style={{
              color: '#dc2626',
              background: '#fee2e2',
              padding: '1rem',
              borderRadius: '4px',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && surveys.length === 0 && (
          <div
            data-testid="empty-state"
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              border: '1px dashed #ccc',
              borderRadius: '8px',
            }}
          >
            No surveys available
          </div>
        )}

        {!loading && !error && surveys.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {surveys.map((survey) => (
              <li
                key={survey.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '1rem 1.25rem',
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Link
                    to={`/surveys/${survey.id}`}
                    style={{ color: '#2563eb', fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none' }}
                  >
                    {survey.title}
                  </Link>
                  {survey.myResponseId && (
                    <span
                      data-testid="answered-badge"
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                      }}
                    >
                      Answered ✔
                    </span>
                  )}
                </div>
                {survey.description && (
                  <p style={{ color: '#4b5563', margin: '0.5rem 0 0 0' }}>{survey.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
