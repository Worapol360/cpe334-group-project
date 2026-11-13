import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api, ApiError } from '../api.js';

export default function ResponseDetail() {
  const { id } = useParams();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadResponse() {
      try {
        setLoading(true);
        setError(null);
        const data = await api(`/api/responses/${id}`);
        if (active) {
          setResponse(data?.response || null);
        }
      } catch (err) {
        if (active) {
          if (err instanceof ApiError && err.status === 404) {
            setError('Response not found');
          } else if (err instanceof ApiError && err.status === 403) {
            setError('You do not have permission to view this response');
          } else {
            setError(err instanceof ApiError ? err.message : 'Failed to load response');
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadResponse();
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

        {loading && <p data-testid="loading">Loading your response…</p>}

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

        {!loading && !error && response && (
          <div>
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '1rem 1.25rem',
                borderRadius: '6px',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>Your response was recorded</h2>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>Thank you for completing this survey.</p>
            </div>

            <h1 style={{ margin: '0 0 0.5rem 0' }}>{response.surveyTitle}</h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Submitted at: {new Date(response.submittedAt).toLocaleString()}
            </p>

            <h2>Your Answers</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {Array.isArray(response.answers) &&
                response.answers.map((ans, idx) => (
                  <div
                    key={ans.questionId || idx}
                    data-testid={`answer-card-${idx + 1}`}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '1.25rem',
                      background: '#fff',
                    }}
                  >
                    <p style={{ fontWeight: 600, margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                      {idx + 1}. {ans.questionText}
                    </p>
                    {ans.type === 'single_choice' && (
                      <p style={{ margin: 0, color: '#1f2937' }}>
                        Selected: <strong style={{ color: '#2563eb' }}>{ans.optionLabel}</strong>
                      </p>
                    )}
                    {ans.type === 'rating' && (
                      <p style={{ margin: 0, color: '#1f2937' }}>
                        Rating: <strong style={{ color: '#2563eb' }}>{ans.ratingValue} / 5</strong>
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

