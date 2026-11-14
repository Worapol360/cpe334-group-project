/**
 * Summary persistence layer (F-05)
 *
 * Grouped, aggregate-only reads for the owner summary. A single groupBy over
 * the answers of one survey returns counts per (question, option, rating)
 * cell; no per-response rows are loaded, so respondent data never reaches the
 * API layer.
 */

export async function loadSummaryCounts(client, surveyId) {
  const [responseCount, grouped] = await Promise.all([
    client.response.count({ where: { surveyId } }),
    client.answer.groupBy({
      by: ['questionId', 'optionId', 'ratingValue'],
      where: { response: { surveyId } },
      _count: { _all: true },
    }),
  ]);

  return {
    responseCount,
    counts: grouped.map((row) => ({
      questionId: row.questionId,
      optionId: row.optionId,
      ratingValue: row.ratingValue,
      count: row._count._all,
    })),
  };
}
