/**
 * Survey publication domain rules (F-03: BR-03, BR-04, BR-05 re-check).
 *
 * Transition table (feature-specs.md F-03, state model):
 *
 *   From \ To   draft               published                    closed
 *   draft       - (rejected)        allowed (owner only)         rejected
 *   published   rejected            rejected (already published) rejected (Sprint 2)
 *   closed      rejected            rejected                     rejected
 *
 * Only draft -> published is allowed; every other pair is rejected with
 * INVALID_STATE_TRANSITION. canModifyStructure(status) (BR-04) is true only
 * for "draft". publishSurvey re-validates the definition with the F-02
 * validator (BR-05, defence in depth) before allowing the transition.
 */

import { validateSurveyInput } from './survey.js';

export function canTransition(fromStatus, toStatus) {
  return fromStatus === 'draft' && toStatus === 'published';
}

export function canModifyStructure(status) {
  return status === 'draft';
}

export function publishSurvey(survey) {
  if (!canTransition(survey?.status, 'published')) {
    return {
      ok: false,
      code: 'INVALID_STATE_TRANSITION',
      message: `Survey cannot be published from status "${survey?.status ?? 'unknown'}"`,
    };
  }

  const validation = validateSurveyInput({
    title: survey.title,
    description: survey.description,
    questions: survey.questions,
  });
  if (!validation.valid) {
    return { ok: false, code: 'VALIDATION_ERROR', fields: validation.fields };
  }

  return { ok: true, status: 'published', publishedAt: new Date() };
}
