import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api, ApiError } from '../api.js';

export default function OwnerSurveyDetail() {
  const { id } = useParams();
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    try {
      const data = await api(`/api/owner/surveys/${id}/publish`, { method: 'POST' });
      setSurvey(data?.survey || null);
      setConfirmOpen(false);
    } catch (err) {
      setPublishError(err instanceof ApiError ? err.message : 'Failed to publish survey');
      setConfirmOpen(false);
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadSurvey() {
      try {
        setLoading(true);
        setError(null);
        const data = await api(`/api/owner/surveys/${id}`);
        if (active) {
          setSurvey(data?.survey || null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load survey');
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
          <Link to="/owner/surveys" style={{ color: '#6b7280', textDecoration: 'none' }}>
            ← Back to Surveys
          </Link>
        </div>

        {loading && <p data-testid="loading">Loading survey…</p>}

        {error && (
          <div data-testid="error-message" role="alert" style={{ color: '#dc2626', background: '#fee2e2', padding: '1rem', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {!loading && !error && survey && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h1 style={{ margin: '0 0 0.5rem 0' }}>{survey.title}</h1>
                {survey.description && (
                  <p style={{ color: '#4b5563', margin: '0 0 0.5rem 0', fontSize: '1.05rem' }}>
                    {survey.description}
                  </p>
                )}
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                  Created on {new Date(survey.createdAt).toLocaleDateString()} · Mode: {survey.mode}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '0.75rem',
                }}
              >
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    background:
                      survey.status === 'published' ? '#dcfce7' : survey.status === 'closed' ? '#f3f4f6' : '#fef3c7',
                    color:
                      survey.status === 'published' ? '#166534' : survey.status === 'closed' ? '#4b5563' : '#92400e',
                  }}
                >
                  {survey.status}
                </span>
                {survey.status === 'draft' && (
                  <button
                    type="button"
                    data-testid="publish-button"
                    onClick={() => {
                      setPublishError(null);
                      setConfirmOpen(true);
                    }}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#fff',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Publish
                  </button>
                )}
              </div>
            </div>

            {publishError && (
              <div
                data-testid="publish-error"
                role="alert"
                style={{
                  color: '#dc2626',
                  background: '#fee2e2',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                }}
              >
                {publishError}
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

            <h2>Questions ({survey.questions?.length || 0})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              {survey.questions && survey.questions.map((q) => (
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      {q.options.map((opt) => (
                        <label
                          key={opt.id || opt.position}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}
                        >
                          <input type="radio" disabled />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
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

            {confirmOpen && (
              <div
                role="dialog"
                aria-modal="true"
                data-testid="publish-confirm-dialog"
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    maxWidth: '420px',
                    width: '100%',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>Publish this survey?</h2>
                  <p style={{ color: '#4b5563' }}>
                    Once you publish, respondents will be able to see this survey and
                    the questions cannot be changed afterwards.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setConfirmOpen(false)}
                      disabled={publishing}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="publish-confirm-button"
                      onClick={handlePublish}
                      disabled={publishing}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        background: '#16a34a',
                        color: '#fff',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {publishing ? 'Publishing…' : 'Publish'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
