import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api, ApiError } from '../api.js';

export default function SurveyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState(null);
  const [myResponseId, setMyResponseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state: { [questionId]: { optionId: number | null, ratingValue: number | null } }
  const [answers, setAnswers] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadSurveyAndStatus() {
      try {
        setLoading(true);
        setError(null);

        const [surveyData, listData] = await Promise.all([
          api(`/api/surveys/${id}`),
          api('/api/surveys').catch(() => null),
        ]);

        if (active) {
          setSurvey(surveyData?.survey || null);

          // Find if this survey is already answered (from detail endpoint or list fallback)
          if (surveyData?.survey?.myResponseId) {
            setMyResponseId(surveyData.survey.myResponseId);
          } else if (Array.isArray(listData?.surveys)) {
            const thisItem = listData.surveys.find((s) => s.id === Number(id));
            if (thisItem?.myResponseId) {
              setMyResponseId(thisItem.myResponseId);
            }
          }
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

    loadSurveyAndStatus();
    return () => {
      active = false;
    };
  }, [id]);

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { optionId, ratingValue: null },
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleSelectRating = (questionId, ratingValue) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { optionId: null, ratingValue },
    }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (myResponseId || submitting) return;

    // Client-side validation: ensure each question has an answer
    const errors = {};
    const formattedAnswers = [];

    if (Array.isArray(survey?.questions)) {
      for (const q of survey.questions) {
        const ans = answers[q.id];
        if (!ans) {
          errors[q.id] = 'Please answer this question';
          continue;
        }

        if (q.type === 'single_choice') {
          if (!ans.optionId) {
            errors[q.id] = 'Please select an option';
          } else {
            formattedAnswers.push({ questionId: q.id, optionId: ans.optionId });
          }
        } else if (q.type === 'rating') {
          if (!ans.ratingValue) {
            errors[q.id] = 'Please select a rating between 1 and 5';
          } else {
            formattedAnswers.push({ questionId: q.id, ratingValue: ans.ratingValue });
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await api(`/api/surveys/${id}/responses`, {
        method: 'POST',
        body: { answers: formattedAnswers },
      });

      if (res?.response?.id) {
        navigate(`/responses/${res.response.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const errCode = err.body?.error?.code;
        const errFields = err.body?.error?.fields;
        const errMsg = err.body?.error?.message || err.message;

        if (err.status === 409 && errCode === 'DUPLICATE_RESPONSE') {
          setSubmitError(errMsg || 'You have already submitted a response to this survey');
          setMyResponseId(true);
        } else if (err.status === 422 && Array.isArray(errFields)) {
          const serverErrors = {};
          errFields.forEach((f) => {
            serverErrors[f.field] = f.message;
            const matchIndex = f.field.match(/^answers\[(\d+)\]/);
            if (matchIndex) {
              const matchedIdx = Number(matchIndex[1]);
              serverErrors[matchedIdx] = f.message;
              const ansObj = formattedAnswers[matchedIdx];
              if (ansObj?.questionId) {
                serverErrors[ansObj.questionId] = f.message;
              }
            }
          });
          setFieldErrors(serverErrors);
          setSubmitError('Please fix the validation errors below');
        } else {
          setSubmitError(errMsg);
        }
      } else {
        setSubmitError('Failed to submit response. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormDisabled = Boolean(myResponseId || submitting);

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

            {myResponseId && (
              <div
                data-testid="already-answered-banner"
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  padding: '1rem',
                  borderRadius: '6px',
                  marginBottom: '1.5rem',
                }}
              >
                <span>You have already submitted a response to this survey. </span>
                {typeof myResponseId === 'number' && (
                  <Link
                    to={`/responses/${myResponseId}`}
                    style={{ color: '#15803d', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    View your submitted response →
                  </Link>
                )}
              </div>
            )}

            {submitError && (
              <div
                data-testid="submit-error"
                role="alert"
                style={{
                  color: '#dc2626',
                  background: '#fee2e2',
                  padding: '1rem',
                  borderRadius: '4px',
                  marginBottom: '1.5rem',
                }}
              >
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <h2>Questions ({survey.questions?.length || 0})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                {survey.questions &&
                  survey.questions.map((q) => {
                    const qError = fieldErrors[q.id] || fieldErrors[`answers[${q.id}]`];

                    return (
                      <fieldset
                        key={q.id}
                        disabled={isFormDisabled}
                        data-testid={`question-card-${q.position}`}
                        style={{
                          border: qError ? '1px solid #ef4444' : '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '1.25rem',
                          background: '#fff',
                        }}
                      >
                        <legend style={{ fontWeight: 600, fontSize: '1.05rem', padding: '0 0.25rem' }}>
                          {q.position}. {q.text}
                        </legend>

                        {/* Single choice questions */}
                        {q.type === 'single_choice' && q.options && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                            {q.options.map((opt) => (
                              <label
                                key={opt.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                                  padding: '0.25rem 0',
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  value={opt.id}
                                  checked={answers[q.id]?.optionId === opt.id}
                                  onChange={() => handleSelectOption(q.id, opt.id)}
                                  disabled={isFormDisabled}
                                />
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Rating questions */}
                        {q.type === 'rating' && (
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                            {[1, 2, 3, 4, 5].map((val) => {
                              const isSelected = answers[q.id]?.ratingValue === val;
                              return (
                                <button
                                  type="button"
                                  key={val}
                                  onClick={() => handleSelectRating(q.id, val)}
                                  disabled={isFormDisabled}
                                  data-testid={`rating-${q.id}-${val}`}
                                  style={{
                                    width: '44px',
                                    height: '44px',
                                    border: isSelected ? '2px solid #2563eb' : '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    background: isSelected ? '#eff6ff' : '#fff',
                                    color: isSelected ? '#1d4ed8' : '#374151',
                                    fontWeight: isSelected ? 700 : 400,
                                    fontSize: '1rem',
                                    cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {qError && (
                          <p
                            data-testid={`error-question-${q.id}`}
                            style={{ color: '#dc2626', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}
                          >
                            {qError}
                          </p>
                        )}
                      </fieldset>
                    );
                  })}
              </div>

              <div style={{ marginTop: '2rem' }}>
                <button
                  type="submit"
                  disabled={isFormDisabled}
                  data-testid="submit-response-button"
                  style={{
                    background: isFormDisabled ? '#9ca3af' : '#2563eb',
                    color: '#fff',
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {myResponseId
                    ? 'Already Submitted'
                    : submitting
                    ? 'Submitting…'
                    : 'Submit Response'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </>
  );
}
