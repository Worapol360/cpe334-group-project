import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma, resetAndSeed } from '../harness/db.js';
import { createApp } from '../../src/app.js';

const app = createApp();
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'change-me';
const OWNER1 = 'owner1@example.test';
const RESPONDENT1 = 'respondent1@example.test';

const S_DRAFT_TITLE = 'Quarterly Team Feedback';
const S_PUB_TITLE = 'Course CPE334 Feedback';
const S_CLOSED_TITLE = 'Past Semester Survey';
const S_OWNER2_TITLE = 'Owner Two Private Survey';

function cookieFrom(res) {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw[0] : raw;
}

async function loginUser(email, password = SEED_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return cookieFrom(res);
}

async function findSeedSurvey(title) {
  const survey = await prisma.survey.findFirst({ where: { title } });
  if (!survey) throw new Error(`Seed survey not found: ${title}`);
  return survey;
}

function postPublish(surveyId) {
  return request(app).post(`/api/owner/surveys/${surveyId}/publish`);
}

beforeEach(async () => {
  await resetAndSeed();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('F-03 Survey Publication API Tests', () => {
  it('TC-F03-01: owner publishes own draft -> 200, status published, published_at set and persisted', async () => {
    const cookie = await loginUser(OWNER1);
    const draft = await findSeedSurvey(S_DRAFT_TITLE);
    expect(draft.status).toBe('draft');
    expect(draft.publishedAt).toBeNull();

    const res = await postPublish(draft.id).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.survey).toBeDefined();
    expect(res.body.survey.id).toBe(draft.id);
    expect(res.body.survey.status).toBe('published');
    expect(res.body.survey.publishedAt).not.toBeNull();

    const detail = await request(app)
      .get(`/api/owner/surveys/${draft.id}`)
      .set('Cookie', cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.survey.status).toBe('published');
    expect(detail.body.survey.publishedAt).not.toBeNull();

    const dbRow = await prisma.survey.findUnique({ where: { id: draft.id } });
    expect(dbRow.status).toBe('published');
    expect(dbRow.publishedAt).not.toBeNull();
  });

  it('TC-F03-02: publishing an already published survey -> 409 INVALID_STATE_TRANSITION, published_at unchanged', async () => {
    const cookie = await loginUser(OWNER1);
    const draft = await findSeedSurvey(S_DRAFT_TITLE);

    const first = await postPublish(draft.id).set('Cookie', cookie);
    expect(first.status).toBe(200);

    const afterFirst = await prisma.survey.findUnique({ where: { id: draft.id } });
    expect(afterFirst.publishedAt).not.toBeNull();
    const publishedAtBefore = afterFirst.publishedAt;

    const second = await postPublish(draft.id).set('Cookie', cookie);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(second.body.survey).toBeUndefined();

    const afterSecond = await prisma.survey.findUnique({ where: { id: draft.id } });
    expect(afterSecond.status).toBe('published');
    expect(afterSecond.publishedAt).toEqual(publishedAtBefore);
  });

  it('TC-F03-03: publishing a closed survey -> 409, status still closed', async () => {
    const cookie = await loginUser(OWNER1);
    const closed = await findSeedSurvey(S_CLOSED_TITLE);
    expect(closed.status).toBe('closed');

    const res = await postPublish(closed.id).set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(res.body.survey).toBeUndefined();

    const dbRow = await prisma.survey.findUnique({ where: { id: closed.id } });
    expect(dbRow.status).toBe('closed');
  });

  it('TC-F03-05: owner1 publishing owner2 draft -> 403, status still draft', async () => {
    const cookie = await loginUser(OWNER1);
    const owner2Draft = await findSeedSurvey(S_OWNER2_TITLE);
    expect(owner2Draft.status).toBe('draft');

    const res = await postPublish(owner2Draft.id).set('Cookie', cookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.survey).toBeUndefined();

    const dbRow = await prisma.survey.findUnique({ where: { id: owner2Draft.id } });
    expect(dbRow.status).toBe('draft');
    expect(dbRow.publishedAt).toBeNull();
  });

  it('TC-F03-06: respondent publish -> 403, no session -> 401', async () => {
    const draft = await findSeedSurvey(S_DRAFT_TITLE);

    const respondentCookie = await loginUser(RESPONDENT1);
    const asRespondent = await postPublish(draft.id).set('Cookie', respondentCookie);
    expect(asRespondent.status).toBe(403);
    expect(asRespondent.body.error.code).toBe('FORBIDDEN');

    const anonymous = await postPublish(draft.id);
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe('UNAUTHENTICATED');

    const dbRow = await prisma.survey.findUnique({ where: { id: draft.id } });
    expect(dbRow.status).toBe('draft');
  });

  it('TC-F03-07: respondent GET /api/surveys returns only published surveys', async () => {
    const cookie = await loginUser(RESPONDENT1);

    const res = await request(app).get('/api/surveys').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.surveys)).toBe(true);

    const titles = res.body.surveys.map((s) => s.title);
    expect(titles).toContain(S_PUB_TITLE);
    expect(titles).not.toContain(S_DRAFT_TITLE);
    expect(titles).not.toContain(S_CLOSED_TITLE);
    expect(titles).not.toContain(S_OWNER2_TITLE);

    for (const item of res.body.surveys) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('description');
    }
  });

  it('TC-F03-08: respondent GET detail of a draft -> 404 with no survey fields', async () => {
    const cookie = await loginUser(RESPONDENT1);
    const draft = await findSeedSurvey(S_DRAFT_TITLE);

    const res = await request(app).get(`/api/surveys/${draft.id}`).set('Cookie', cookie);

    expect(res.status).toBe(404);
    expect(res.body.survey).toBeUndefined();
    expect(res.body.title).toBeUndefined();
    expect(res.body.questions).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(S_DRAFT_TITLE);

    const published = await findSeedSurvey(S_PUB_TITLE);
    const publishedRes = await request(app)
      .get(`/api/surveys/${published.id}`)
      .set('Cookie', cookie);
    expect(publishedRes.status).toBe(200);
    expect(publishedRes.body.survey.title).toBe(S_PUB_TITLE);
  });
});
