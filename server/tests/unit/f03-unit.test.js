import { describe, expect, it } from 'vitest';

const STATUSES = ['draft', 'published', 'closed'];

describe('F-03 Survey Publication Unit Tests', () => {
  it('TC-F03-04: transition function over all 9 from/to pairs allows only draft->published', async () => {
    const { canTransition } = await import('../../src/domain/publication.js');

    const allowed = [];
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        const result = canTransition(from, to);
        if (result === true) allowed.push(`${from}->${to}`);
        if (from === 'draft' && to === 'published') {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }
    }
    expect(allowed).toEqual(['draft->published']);
  });

  it('TC-F03-09: canModifyStructure is true only for draft (false for published and closed)', async () => {
    const { canModifyStructure } = await import('../../src/domain/publication.js');

    expect(canModifyStructure('draft')).toBe(true);
    expect(canModifyStructure('published')).toBe(false);
    expect(canModifyStructure('closed')).toBe(false);
  });

  it('TC-F03-10: publish use case rejects a survey with zero questions (BR-05) and does not change status', async () => {
    const { publishSurvey } = await import('../../src/domain/publication.js');

    const survey = {
      id: 42,
      ownerId: 1,
      status: 'draft',
      publishedAt: null,
      title: 'Broken survey',
      description: null,
      questions: [],
    };

    const result = publishSurvey(survey);

    expect(result.ok).toBe(false);
    expect(result.fields).toContainEqual(expect.objectContaining({ field: 'questions' }));
    expect(survey.status).toBe('draft');
    expect(survey.publishedAt).toBeNull();
  });
});
