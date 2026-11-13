import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api, ApiError } from '../api.js';

export default function SurveyDetail() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSurvey() {
      try {
        setLoading(true);
        setError(null);
        const data = await api(`/api/surveys/${id}`);
        if (active) {
          setSurvey(data?.survey || null);
        }
      } catch (err) {
        if (active) {
          if (err instanceof ApiError && err.status === 404) {
            setError('Survey not found');
          } else {
            setError(err instanceof ApiError ? err.message : 'Failed to load survey');
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSurvey();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/surveys" style={{ color: '#6b7280', textDecoration: 'none' }}>
            ← Back to surveys
          </Link>
        </div>

        {loading && <p data-testid="loading">Loading survey…</p>}

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

        {!loading && !error && survey && (
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0' }}>{survey.title}</h1>
            {survey.description && (
              <p style={{ color: '#4b5563', margin: '0 0 1.5rem 0', fontSize: '1.05rem' }}>
                {survey.description}
              </p>
            )}

            <h2>Questions ({survey.questions?.length || 0})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {survey.questions &&
                survey.questions.map((q) => (
                  <div
                    key={q.id || q.position}
                    data-testid={`question-card-${q.position}`}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '1rem 1.25rem',
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                        {q.position}. {q.text}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'capitalize' }}>
                        {q.type.replace('_', ' ')}
                      </span>
                    </div>

                    {q.type === 'single_choice' && q.options && (
                      <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', color: '#374151' }}>
                        {q.options.map((opt) => (
                          <li key={opt.id} style={{ margin: '0.25rem 0' }}>
                            {opt.label}
                          </li>
                        ))}
                      </ul>
                    )}

                    {q.type === 'rating' && (
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        {[1, 2, 3, 4, 5].map((val) => (
                          <div
                            key={val}
                            style={{
                              width: '36px',
                              height: '36px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#6b7280',
                              fontSize: '0.9rem',
                            }}
                          >
                            {val}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* F-04: the answer form and submit action will be rendered here. */}
          </div>
        )}
      </main>
    </>
  );
}
