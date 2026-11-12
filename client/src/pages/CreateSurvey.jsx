import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { api, ApiError } from '../api.js';

export default function CreateSurvey() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([
    {
      text: '',
      type: 'single_choice',
      options: ['', ''],
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  function addQuestion() {
    if (questions.length >= 20) return;
    setQuestions([
      ...questions,
      {
        text: '',
        type: 'single_choice',
        options: ['', ''],
      },
    ]);
  }

  function removeQuestion(index) {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index, key, value) {
    const next = [...questions];
    next[index] = { ...next[index], [key]: value };
    if (key === 'type' && value === 'single_choice' && (!next[index].options || next[index].options.length < 2)) {
      next[index].options = ['', ''];
    }
    setQuestions(next);
  }

  function addOption(qIndex) {
    const q = questions[qIndex];
    if (q.options && q.options.length >= 10) return;
    const next = [...questions];
    next[qIndex] = {
      ...q,
      options: [...(q.options || []), ''],
    };
    setQuestions(next);
  }

  function removeOption(qIndex, optIndex) {
    const q = questions[qIndex];
    if (q.options && q.options.length <= 2) return;
    const next = [...questions];
    next[qIndex] = {
      ...q,
      options: q.options.filter((_, i) => i !== optIndex),
    };
    setQuestions(next);
  }

  function updateOption(qIndex, optIndex, value) {
    const next = [...questions];
    const nextOpts = [...next[qIndex].options];
    nextOpts[optIndex] = value;
    next[qIndex] = { ...next[qIndex], options: nextOpts };
    setQuestions(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setServerError(null);
    setFieldErrors({});

    // Client-side quick check
    const errors = {};
    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.trim().length > 200) {
      errors.title = 'Title must be at most 200 characters';
    }

    if (questions.length < 1) {
      errors.questions = 'At least 1 question is required';
    }

    questions.forEach((q, qIndex) => {
      if (!q.text.trim()) {
        errors[`questions[${qIndex}].text`] = 'Question text is required';
      }
      if (q.type === 'single_choice') {
        if (!q.options || q.options.length < 2) {
          errors[`questions[${qIndex}].options`] = 'Single-choice question requires at least 2 options';
        } else {
          q.options.forEach((opt, optIndex) => {
            if (!opt.trim()) {
              errors[`questions[${qIndex}].options[${optIndex}]`] = 'Option label cannot be empty';
            }
          });
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          type: q.type,
          options: q.type === 'single_choice' ? q.options.map((o) => o.trim()) : undefined,
        })),
      };

      const res = await api('/api/owner/surveys', {
        method: 'POST',
        body: payload,
      });

      if (res && res.survey) {
        navigate(`/owner/surveys/${res.survey.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.body && err.body.error) {
        setServerError(err.body.error.message || 'Validation failed');
        if (Array.isArray(err.body.error.fields)) {
          const sErrors = {};
          err.body.error.fields.forEach((f) => {
            sErrors[f.field] = f.message;
          });
          setFieldErrors(sErrors);
        }
      } else {
        setServerError(err.message || 'Failed to save survey');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/owner/surveys" style={{ color: '#6b7280', textDecoration: 'none' }}>
            ← Back to Surveys
          </Link>
          <h1 style={{ marginTop: '0.5rem' }}>Create New Survey</h1>
        </div>

        {serverError && (
          <div data-testid="server-error" role="alert" style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Survey Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              Survey Title *
            </label>
            <input
              type="text"
              data-testid="survey-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Employee Engagement Q4"
              maxLength={205}
              style={{
                width: '100%',
                padding: '0.6rem',
                border: fieldErrors.title ? '1px solid #dc2626' : '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
            {fieldErrors.title && (
              <span data-testid="title-error" style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                {fieldErrors.title}
              </span>
            )}
          </div>

          {/* Survey Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
              Description (Optional)
            </label>
            <textarea
              data-testid="survey-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context or instructions for respondents..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.6rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.95rem',
              }}
            />
          </div>

          {/* Questions Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Questions ({questions.length}/20)</h2>
              <button
                type="button"
                data-testid="add-question-btn"
                onClick={addQuestion}
                disabled={questions.length >= 20}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: questions.length >= 20 ? 'not-allowed' : 'pointer',
                }}
              >
                + Add Question
              </button>
            </div>

            {fieldErrors.questions && (
              <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem' }}>{fieldErrors.questions}</p>
            )}

            {questions.map((q, qIndex) => {
              const qErrorKey = `questions[${qIndex}].text`;
              const qOptsErrorKey = `questions[${qIndex}].options`;
              return (
                <div
                  key={qIndex}
                  data-testid={`question-item-${qIndex}`}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>Question {qIndex + 1}</span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        data-testid={`remove-question-btn-${qIndex}`}
                        onClick={() => removeQuestion(qIndex)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      data-testid={`question-text-${qIndex}`}
                      value={q.text}
                      onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                      placeholder="Enter question text..."
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: fieldErrors[qErrorKey] ? '1px solid #dc2626' : '1px solid #d1d5db',
                        borderRadius: '4px',
                      }}
                    />
                    <select
                      data-testid={`question-type-${qIndex}`}
                      value={q.type}
                      onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                      style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    >
                      <option value="single_choice">Single Choice</option>
                      <option value="rating">Rating (1 to 5)</option>
                    </select>
                  </div>
                  {fieldErrors[qErrorKey] && (
                    <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      {fieldErrors[qErrorKey]}
                    </div>
                  )}

                  {/* Options for single choice */}
                  {q.type === 'single_choice' && (
                    <div style={{ marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid #e5e7eb' }}>
                      <span style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}>
                        Options (2–10):
                      </span>
                      {fieldErrors[qOptsErrorKey] && (
                        <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                          {fieldErrors[qOptsErrorKey]}
                        </div>
                      )}
                      {q.options && q.options.map((opt, optIndex) => {
                        const optErrorKey = `questions[${qIndex}].options[${optIndex}]`;
                        return (
                          <div key={optIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#6b7280', width: '20px' }}>{optIndex + 1}.</span>
                            <input
                              type="text"
                              data-testid={`option-input-${qIndex}-${optIndex}`}
                              value={opt}
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                              placeholder={`Option ${optIndex + 1}`}
                              style={{
                                flex: 1,
                                padding: '0.4rem',
                                border: fieldErrors[optErrorKey] ? '1px solid #dc2626' : '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                              }}
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(qIndex, optIndex)}
                                style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {q.options && q.options.length < 10 && (
                        <button
                          type="button"
                          data-testid={`add-option-btn-${qIndex}`}
                          onClick={() => addOption(qIndex)}
                          style={{
                            marginTop: '0.25rem',
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          + Add option
                        </button>
                      )}
                    </div>
                  )}

                  {q.type === 'rating' && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                      Rating scale: Fixed 1 (Lowest) to 5 (Highest)
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              type="submit"
              data-testid="submit-survey-btn"
              disabled={saving}
              style={{
                padding: '0.6rem 1.5rem',
                background: saving ? '#93c5fd' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving Survey…' : 'Save as Draft'}
            </button>
            <Link to="/owner/surveys" style={{ color: '#6b7280', textDecoration: 'none' }}>
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </>
  );
}

