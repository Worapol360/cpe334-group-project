import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api, ApiError } from '../api.js';

export default function OwnerSurveys() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSurveys() {
      try {
        setLoading(true);
        setError(null);
        const data = await api('/api/owner/surveys');
        if (active) {
          setSurveys(data?.surveys || []);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1>My Surveys</h1>
          <Link
            to="/owner/surveys/new"
            style={{
              padding: '0.5rem 1rem',
              background: '#2563eb',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 500,
            }}
          >
            + Create Survey
          </Link>
        </div>

        {loading && <p data-testid="loading">Loading surveys…</p>}

        {error && (
          <div data-testid="error-message" role="alert" style={{ color: '#dc2626', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {!loading && !error && surveys.length === 0 && (
          <div data-testid="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', border: '1px dashed #ccc', borderRadius: '8px' }}>
            <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem' }}>No surveys yet</p>
            <Link
              to="/owner/surveys/new"
              style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: '#2563eb',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '4px',
              }}
            >
              Create your first survey
            </Link>
          </div>
        )}

        {!loading && !error && surveys.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem' }}>Title</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Created At</th>
                <th style={{ padding: '0.75rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((survey) => (
                <tr key={survey.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                    <Link to={`/owner/surveys/${survey.id}`} style={{ color: '#2563eb' }}>
                      {survey.title}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        background:
                          survey.status === 'published' ? '#dcfce7' : survey.status === 'closed' ? '#f3f4f6' : '#fef3c7',
                        color:
                          survey.status === 'published' ? '#166534' : survey.status === 'closed' ? '#4b5563' : '#92400e',
                      }}
                    >
                      {survey.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: '#6b7280' }}>
                    {new Date(survey.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <Link to={`/owner/surveys/${survey.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
