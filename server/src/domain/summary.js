/**
 * Owner aggregate summary domain rules (F-05: FR-11, BR-07).
 *
 * aggregate(surveyDefinition, responses) is pure: no HTTP, no database access
 * and no respondent data in the output. `responses` is either an array of
 * response rows ({ answers: [{ questionId, optionId, ratingValue }] }) or the
 * grouped counts object produced by the persistence layer
 * ({ responseCount, counts: [{ questionId, optionId, ratingValue, count }] });
 * both are reduced to grouped counts before aggregating, so the result only
 * ever contains counts, percentages and averages.
 *
 * Rules (feature-specs.md F-05):
 * - responseCount = number of responses.
 * - single_choice: count and percent = count/responseCount*100 rounded to 1
 *   decimal per option (zero-vote options listed); percent 0 when there are
 *   no responses.
 * - rating: distribution for 1..5 (zeros included) and average rounded to
 *   2 decimals, null when there are no responses.
 */

const RATING_VALUES = [1, 2, 3, 4, 5];

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function percentOf(count, responseCount) {
  if (!responseCount) return 0;
  return roundTo((count / responseCount) * 100, 1);
}

function toGroupedCounts(source) {
  if (Array.isArray(source)) {
    const counts = [];
    for (const response of source) {
      const answers = Array.isArray(response?.answers) ? response.answers : [];
      for (const answer of answers) {
        counts.push({
          questionId: answer?.questionId,
          optionId: answer?.optionId ?? null,
          ratingValue: answer?.ratingValue ?? null,
          count: 1,
        });
      }
    }
    return { responseCount: source.length, counts };
  }

  return {
    responseCount: source?.responseCount ?? 0,
    counts: Array.isArray(source?.counts) ? source.counts : [],
  };
}

export function aggregate(surveyDefinition, responses) {
  const { responseCount, counts } = toGroupedCounts(responses);

  const choiceCounts = new Map();
  const ratingCounts = new Map();
  for (const row of counts) {
    if (row.optionId !== null && row.optionId !== undefined) {
      const key = `${row.questionId}:${row.optionId}`;
      choiceCounts.set(key, (choiceCounts.get(key) || 0) + row.count);
    } else if (row.ratingValue !== null && row.ratingValue !== undefined) {
      const key = `${row.questionId}:${row.ratingValue}`;
      ratingCounts.set(key, (ratingCounts.get(key) || 0) + row.count);
    }
  }

  const questions = Array.isArray(surveyDefinition?.questions)
    ? surveyDefinition.questions
    : [];

  const summaryQuestions = questions.map((question) => {
    if (question.type === 'single_choice') {
      const options = (Array.isArray(question.options) ? question.options : []).map(
        (option) => {
          const count = choiceCounts.get(`${question.id}:${option.id}`) || 0;
          return {
            optionId: option.id,
            label: option.label,
            count,
            percent: percentOf(count, responseCount),
          };
        },
      );
      return {
        questionId: question.id,
        text: question.text,
        type: question.type,
        options,
      };
    }

    if (question.type === 'rating') {
      const distribution = {};
      let total = 0;
      let answered = 0;
      for (const value of RATING_VALUES) {
        const count = ratingCounts.get(`${question.id}:${value}`) || 0;
        distribution[String(value)] = count;
        total += value * count;
        answered += count;
      }
      return {
        questionId: question.id,
        text: question.text,
        type: question.type,
        distribution,
        average: answered > 0 ? roundTo(total / answered, 2) : null,
      };
    }

    return {
      questionId: question.id,
      text: question.text,
      type: question.type,
    };
  });

  return {
    surveyId: surveyDefinition?.id,
    title: surveyDefinition?.title,
    status: surveyDefinition?.status,
    responseCount,
    questions: summaryQuestions,
  };
}
