import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api, ApiError } from '../api.js';

const STATUS_COLORS = {
  published: { background: '#dcfce7', color: '#166534' },
  closed: { background: '#f3f4f6', color: '#4b5563' },
  draft: { background: '#fef3c7', color: '#92400e' },
};

function statusBadgeStyle(status) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    fontWeight: 600,
    background: colors.background,
    color: colors.color,
  };
}

export default function OwnerSurveySummary() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        const data = await api(`/api/owner/surveys/${id}/summary`);
        if (active) {
          setSummary(data?.summary || null);
        }
      } catch (err) {
        if (active) {
          if (err instanceof ApiError && err.status === 404) {
            setError('Survey not found');
          } else if (err instanceof ApiError && err.status === 403) {
            setError('You are not allowed to view this summary');
          } else {
            setError(err instanceof ApiError ? err.message : 'Failed to load summary');
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSummary();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            to={`/owner/surveys/${id}`}
            style={{ color: '#6b7280', textDecoration: 'none' }}
          >
            ← Back to Survey
          </Link>
        </div>

        {loading && <p data-testid="loading">Loading summary…</p>}

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

        {!loading && !error && summary && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <h1 style={{ margin: '0 0 0.5rem 0' }}>{summary.title}</h1>
                <span style={statusBadgeStyle(summary.status)}>{summary.status}</span>
              </div>
              <p
                data-testid="summary-response-count"
                style={{ margin: 0, color: '#4b5563', fontSize: '1.05rem' }}
              >
                {summary.responseCount}{' '}
                {summary.responseCount === 1 ? 'response' : 'responses'}
              </p>
            </div>

            {summary.responseCount === 0 && (
              <div
                data-testid="empty-state"
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  border: '1px dashed #ccc',
                  borderRadius: '8px',
                }}
              >
                No responses yet
              </div>
            )}

            {summary.responseCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginTop: '1.5rem',
                }}
              >
                {summary.questions.map((question) => (
                  <div
                    key={question.questionId}
                    data-testid={`summary-question-${question.questionId}`}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '1rem 1.25rem',
                      background: '#fff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{question.text}</span>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          textTransform: 'capitalize',
                        }}
                      >
                        {question.type.replace('_', ' ')}
                      </span>
                    </div>

                    {question.type === 'single_choice' && (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                            <th style={{ padding: '0.5rem 0' }}>Option</th>
                            <th style={{ padding: '0.5rem 0', width: '80px' }}>Count</th>
                            <th style={{ padding: '0.5rem 0', width: '100px' }}>Percent</th>
                            <th style={{ padding: '0.5rem 0' }}> </th>
                          </tr>
                        </thead>
                        <tbody>
                          {question.options.map((option) => (
                            <tr
                              key={option.optionId}
                              data-testid="summary-option-row"
                              style={{ borderBottom: '1px solid #f3f4f6' }}
                            >
                              <td style={{ padding: '0.5rem 0' }}>{option.label}</td>
                              <td style={{ padding: '0.5rem 0' }}>{option.count}</td>
                              <td style={{ padding: '0.5rem 0' }}>{option.percent}%</td>
                              <td style={{ padding: '0.5rem 0' }}>
                                <div
                                  style={{
                                    height: '10px',
                                    width: `${option.percent}%`,
                                    minWidth: option.count > 0 ? '4px' : 0,
                                    background: '#2563eb',
                                    borderRadius: '9999px',
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {question.type === 'rating' && (
                      <div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>
                              <th style={{ padding: '0.5rem 0' }}>Rating</th>
                              {[1, 2, 3, 4, 5].map((value) => (
                                <th key={value} style={{ padding: '0.5rem 0', width: '15%' }}>
                                  {value}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: '0.5rem 0', color: '#6b7280' }}>Count</td>
                              {[1, 2, 3, 4, 5].map((value) => (
                                <td key={value} style={{ padding: '0.5rem 0' }}>
                                  {question.distribution[String(value)]}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                        <p
                          data-testid="summary-rating-average"
                          style={{ margin: '0.75rem 0 0 0', color: '#374151' }}
                        >
                          Average:{' '}
                          {question.average === null || question.average === undefined
                            ? '—'
                            : question.average}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
