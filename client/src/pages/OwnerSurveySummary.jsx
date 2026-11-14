import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api, ApiError } from '../api.js';
import './OwnerSurveySummary.css';

const STATUS_COLORS = {
  published: { background: '#dcfce7', color: '#166534' },
  closed: { background: '#f3f4f6', color: '#4b5563' },
  draft: { background: '#fef3c7', color: '#92400e' },
};

const RATING_LEVELS = [1, 2, 3, 4, 5];

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

function formatUpdatedAt(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.` +
    `${pad(date.getMilliseconds(), 3)}`
  );
}

function formatPercent(percent) {
  return `${percent.toFixed(1)}%`;
}

function describeError(err) {
  if (!(err instanceof ApiError)) {
    return {
      retryable: true,
      message: 'Failed to load summary. Check your connection and try again.',
    };
  }
  if (err.status === 404) {
    return { retryable: false, message: 'Survey not found' };
  }
  if (err.status === 403) {
    return { retryable: false, message: 'You are not allowed to view this summary' };
  }
  if (err.status >= 500) {
    return { retryable: true, message: err.message || 'Failed to load summary' };
  }
  return { retryable: false, message: err.message || 'Failed to load summary' };
}

export default function OwnerSurveySummary() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const currentRequest = useRef({ id, token: 0 });
  currentRequest.current = { id, token: reloadToken };

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    const request = { id, token: reloadToken };
    const isCurrent = () =>
      currentRequest.current.id === request.id &&
      currentRequest.current.token === request.token;

    async function loadSummary() {
      setLoading(true);
      setError(null);
      try {
        const data = await api(`/api/owner/surveys/${id}/summary`);
        if (isCurrent()) setSummary(data?.summary || null);
      } catch (err) {
        if (isCurrent()) setError(describeError(err));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    }

    loadSummary();
  }, [id, reloadToken]);

  const questionCards = useMemo(() => {
    if (!summary) return [];
    return summary.questions.map((question) => (
      <section
        key={question.questionId}
        data-testid={`summary-question-${question.questionId}`}
        className="summary-card"
      >
        <div className="summary-card-head">
          <span style={{ fontWeight: 600 }}>{question.text}</span>
          <span className="summary-type">{question.type.replace('_', ' ')}</span>
        </div>

        {question.type === 'single_choice' && (
          <table className="summary-table">
            <thead>
              <tr>
                <th>Option</th>
                <th className="summary-col-count">Count</th>
                <th className="summary-col-percent">Percent</th>
                <th className="summary-col-bar"> </th>
              </tr>
            </thead>
            <tbody>
              {question.options.map((option) => (
                <tr key={option.optionId}>
                  <td role="cell">{option.label}</td>
                  <td role="cell">
                    <span className="summary-stack-label">Count</span>
                    <span data-testid={`option-count-${option.optionId}`}>{option.count}</span>
                  </td>
                  <td role="cell">
                    <span className="summary-stack-label">Percent</span>
                    <span data-testid={`option-percent-${option.optionId}`}>
                      {formatPercent(option.percent)}
                    </span>
                  </td>
                  <td role="cell" className="summary-bar-cell">
                    <div
                      className="summary-bar"
                      style={{
                        width: `${option.percent}%`,
                        minWidth: option.count > 0 ? '4px' : 0,
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
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Rating</th>
                  {RATING_LEVELS.map((value) => (
                    <th key={value}>{value}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td role="cell">Count</td>
                  {RATING_LEVELS.map((value) => (
                    <td key={value} role="cell">
                      <span className="summary-stack-label">{value}</span>
                      <span data-testid={`rating-count-${question.questionId}-${value}`}>
                        {question.distribution[String(value)]}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p style={{ margin: '0.75rem 0 0', color: '#374151' }}>
              Average:{' '}
              <span data-testid={`rating-average-${question.questionId}`}>
                {question.average === null || question.average === undefined
                  ? '—'
                  : question.average.toFixed(2)}
              </span>
            </p>
          </div>
        )}
      </section>
    ));
  }, [summary]);

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

        {error && error.retryable && (
          <div
            data-testid="summary-error"
            role="alert"
            style={{
              color: '#dc2626',
              background: '#fee2e2',
              padding: '1rem',
              borderRadius: '4px',
            }}
          >
            <p style={{ margin: '0 0 0.75rem 0' }}>{error.message}</p>
            <button type="button" className="summary-retry" data-testid="summary-retry" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        {error && !error.retryable && (
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
            {error.message}
          </div>
        )}

        {!error && loading && !summary && <p data-testid="loading">Loading summary…</p>}

        {!error && loading && summary && (
          <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280' }}>Refreshing…</p>
        )}

        {!error && summary && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <div className="summary-header">
                <h1 style={{ margin: '0 0 0.5rem 0', overflowWrap: 'anywhere' }}>
                  {summary.title}
                </h1>
                <span style={statusBadgeStyle(summary.status)}>{summary.status}</span>
              </div>
              <p
                data-testid="summary-response-count"
                style={{ margin: 0, color: '#4b5563', fontSize: '1.05rem' }}
              >
                {summary.responseCount}{' '}
                {summary.responseCount === 1 ? 'response' : 'responses'}
              </p>
              <div className="summary-meta">
                <span data-testid="summary-updated-at" style={{ color: '#6b7280' }}>
                  Updated at {formatUpdatedAt(summary.generatedAt)}
                </span>
                <button
                  type="button"
                  className="summary-refresh"
                  data-testid="summary-refresh"
                  onClick={reload}
                >
                  Refresh
                </button>
              </div>
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

            <div className="summary-questions">{questionCards}</div>
          </div>
        )}
      </main>
    </>
  );
}
