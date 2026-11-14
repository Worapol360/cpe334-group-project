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
 * - single_choice: count per option (zero-vote options listed); percent is
 *   count/responseCount*100 rounded to 1 decimal by the largest-remainder
 *   method: integer tenths = floor(count*1000/responseCount), then the
 *   leftover tenths needed to reach 1000 (100.0 %) are given one each to the
 *   largest fractional remainders (ties -> lower option position), so the
 *   percents sum to exactly 100.0 when responseCount > 0 and are all 0 when
 *   responseCount is 0.
 * - rating: distribution for 1..5 (zeros included) and average rounded to
 *   2 decimals, null when there are no responses.
 */

const RATING_VALUES = [1, 2, 3, 4, 5];

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Integer largest-remainder rounding of per-option counts to tenths of a
 * percent that sum to exactly 1000 (100.0 %) when responseCount > 0.
 */
function percentsOf(counts, responseCount) {
  if (!responseCount || counts.length === 0) return counts.map(() => 0);

  const tenths = counts.map((count) => Math.floor((count * 1000) / responseCount));
  const order = counts
    .map((count, index) => ({
      index,
      remainder: count * 1000 - tenths[index] * responseCount,
    }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  let leftover = 1000 - tenths.reduce((sum, value) => sum + value, 0);
  for (let round = 0; leftover > 0; round += 1) {
    tenths[order[round % order.length].index] += 1;
    leftover -= 1;
  }

  return tenths.map((value) => value / 10);
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
      const optionList = Array.isArray(question.options) ? question.options : [];
      const optionCounts = optionList.map(
        (option) => choiceCounts.get(`${question.id}:${option.id}`) || 0,
      );
      const optionPercents = percentsOf(optionCounts, responseCount);
      const options = optionList.map((option, index) => ({
        optionId: option.id,
        label: option.label,
        count: optionCounts[index],
        percent: optionPercents[index],
      }));
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
