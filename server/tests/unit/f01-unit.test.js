import { describe, expect, it } from 'vitest';
import { checkRole } from '../../src/domain/roles.js';

describe('TC-F01-10 unit part: requireRole domain check', () => {
  it('TC-F01-10: rejects a respondent session for an owner-only route', () => {
    expect(checkRole({ id: 1, displayName: 'Respondent One', role: 'respondent' }, 'owner')).toBe(
      false,
    );
  });

  it('TC-F01-10: accepts an owner session for an owner-only route', () => {
    expect(checkRole({ id: 2, displayName: 'Owner One', role: 'owner' }, 'owner')).toBe(true);
  });
});
