/**
 * System-level Integration Tests (Issue #07 – TEST-01)
 *
 * TC-INT-01 … TC-INT-07 as specified in tests.md §3.
 * Uses the same Vitest + supertest stack as the per-feature API tests.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma, resetAndSeed } from '../harness/db.js';
import { createApp } from '../../src/app.js';

const app = createApp();
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'change-me';
const OWNER1 = 'owner1@example.test';
const OWNER2 = 'owner2@example.test';
const RESPONDENT1 = 'respondent1@example.test';
const RESPONDENT2 = 'respondent2@example.test';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function cookieFrom(res) {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw[0] : raw;
}

async function loginUser(email, password = SEED_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return cookieFrom(res);
}

function expectNoPrivateData(body) {
  const json = JSON.stringify(body);
  expect(json).not.toMatch(/password_hash|passwordHash|token_hash|tokenHash/i);
  expect(json).not.toMatch(/stack|node_modules|\\\/src\\\//i);
}

function collectKeys(value, acc = new Set()) {
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      acc.add(key);
      collectKeys(nested, acc);
    }
  }
  return acc;
}

const FORBIDDEN_IDENTITY_KEYS = [
  'respondentId',
  'email',
  'displayName',
  'responseId',
  'answers',
  'userId',
  'passwordHash',
  'password_hash',
  'tokenHash',
  'token_hash',
];

/* ------------------------------------------------------------------ */
/*  Setup / teardown                                                  */
/* ------------------------------------------------------------------ */

beforeEach(async () => {
  await resetAndSeed();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/* ================================================================== */
/*  TC-INT-01  Permission Matrix                                      */
/* ================================================================== */
describe('TC-INT-01: Permission Matrix – every endpoint × 4 actor types', () => {
  /*
   * For each endpoint in the system (SDS §6.1) we test with:
   *   (a) anonymous  (b) respondent  (c) owner-own  (d) owner-other
   * and assert the expected status codes.
   */

  let anonReq;       // no cookie
  let respondentCookie;
  let owner1Cookie;
  let owner2Cookie;

  let publishedSurveyId;
  let draftSurveyId;
  let owner2DraftId;
  let respondent1ResponseId;

  beforeEach(async () => {
    // Login all actors
    respondentCookie = await loginUser(RESPONDENT1);
    owner1Cookie = await loginUser(OWNER1);
    owner2Cookie = await loginUser(OWNER2);

    // Get survey IDs
    const pubSurvey = await prisma.survey.findFirst({
      where: { title: 'Course CPE334 Feedback', status: 'published' },
      include: { questions: { include: { options: true } } },
    });
    publishedSurveyId = pubSurvey.id;

    const draftSurvey = await prisma.survey.findFirst({
      where: { title: 'Quarterly Team Feedback', status: 'draft' },
    });
    draftSurveyId = draftSurvey.id;

    const owner2Draft = await prisma.survey.findFirst({
      where: { title: 'Owner Two Private Survey', status: 'draft' },
    });
    owner2DraftId = owner2Draft.id;

    // Create a response so we can test GET /api/responses/:id
    const qSingle = pubSurvey.questions.find((q) => q.type === 'single_choice');
    const qRating = pubSurvey.questions.find((q) => q.type === 'rating');
    const createRes = await request(app)
      .post(`/api/surveys/${publishedSurveyId}/responses`)
      .set('Cookie', respondentCookie)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[0].id },
          { questionId: qRating.id, ratingValue: 5 },
        ],
      });
    expect(createRes.status).toBe(201);
    respondent1ResponseId = createRes.body.response.id;
  });

  // ---- Health (public) ----
  it('GET /api/health – all actors get 200', async () => {
    const anon = await request(app).get('/api/health');
    expect(anon.status).toBe(200);

    const resp = await request(app).get('/api/health').set('Cookie', respondentCookie);
    expect(resp.status).toBe(200);

    const own = await request(app).get('/api/health').set('Cookie', owner1Cookie);
    expect(own.status).toBe(200);
  });

  // ---- Auth endpoints ----
  it('POST /api/auth/login – all actors get 200 on valid credentials (no role guard)', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: RESPONDENT1, password: SEED_PASSWORD });
    expect(r.status).toBe(200);
  });

  it('POST /api/auth/logout – anonymous 401, authenticated 204', async () => {
    const anon = await request(app).post('/api/auth/logout');
    expect(anon.status).toBe(401);

    const resp = await request(app).post('/api/auth/logout').set('Cookie', respondentCookie);
    expect(resp.status).toBe(204);
  });

  it('GET /api/auth/me – anonymous 401, authenticated 200', async () => {
    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);
    expectNoPrivateData(anon.body);

    const resp = await request(app).get('/api/auth/me').set('Cookie', respondentCookie);
    expect(resp.status).toBe(200);
  });

  // ---- Owner survey routes ----
  it('GET /api/owner/surveys – anonymous 401, respondent 403, owner 200', async () => {
    const anon = await request(app).get('/api/owner/surveys');
    expect(anon.status).toBe(401);
    expectNoPrivateData(anon.body);

    const resp = await request(app).get('/api/owner/surveys').set('Cookie', respondentCookie);
    expect(resp.status).toBe(403);
    expectNoPrivateData(resp.body);

    const own = await request(app).get('/api/owner/surveys').set('Cookie', owner1Cookie);
    expect(own.status).toBe(200);
  });

  it('POST /api/owner/surveys – anonymous 401, respondent 403, owner 201', async () => {
    const body = {
      title: 'Permission Test Survey',
      questions: [
        { position: 1, text: 'Q1', type: 'rating' },
      ],
    };

    const anon = await request(app).post('/api/owner/surveys').send(body);
    expect(anon.status).toBe(401);

    const resp = await request(app).post('/api/owner/surveys').set('Cookie', respondentCookie).send(body);
    expect(resp.status).toBe(403);

    const own = await request(app).post('/api/owner/surveys').set('Cookie', owner1Cookie).send(body);
    expect(own.status).toBe(201);
  });

  it('GET /api/owner/surveys/:id – anonymous 401, respondent 403, owner-own 200, owner-other 403', async () => {
    const anon = await request(app).get(`/api/owner/surveys/${draftSurveyId}`);
    expect(anon.status).toBe(401);

    const resp = await request(app).get(`/api/owner/surveys/${draftSurveyId}`).set('Cookie', respondentCookie);
    expect(resp.status).toBe(403);

    const own = await request(app).get(`/api/owner/surveys/${draftSurveyId}`).set('Cookie', owner1Cookie);
    expect(own.status).toBe(200);

    const other = await request(app).get(`/api/owner/surveys/${draftSurveyId}`).set('Cookie', owner2Cookie);
    expect(other.status).toBe(403);
    expect(other.body.survey).toBeUndefined();
  });

  it('POST /api/owner/surveys/:id/publish – anonymous 401, respondent 403, owner-other 403, owner-own 200', async () => {
    const anon = await request(app).post(`/api/owner/surveys/${draftSurveyId}/publish`);
    expect(anon.status).toBe(401);

    const resp = await request(app).post(`/api/owner/surveys/${draftSurveyId}/publish`).set('Cookie', respondentCookie);
    expect(resp.status).toBe(403);

    const other = await request(app).post(`/api/owner/surveys/${draftSurveyId}/publish`).set('Cookie', owner2Cookie);
    expect(other.status).toBe(403);

    const own = await request(app).post(`/api/owner/surveys/${draftSurveyId}/publish`).set('Cookie', owner1Cookie);
    expect(own.status).toBe(200);
  });

  it('GET /api/owner/surveys/:id/summary – anonymous 401, respondent 403, owner-other 403, owner-own 200', async () => {
    const anon = await request(app).get(`/api/owner/surveys/${publishedSurveyId}/summary`);
    expect(anon.status).toBe(401);

    const resp = await request(app).get(`/api/owner/surveys/${publishedSurveyId}/summary`).set('Cookie', respondentCookie);
    expect(resp.status).toBe(403);

    const other = await request(app).get(`/api/owner/surveys/${publishedSurveyId}/summary`).set('Cookie', owner2Cookie);
    expect(other.status).toBe(403);
    expect(other.body.summary).toBeUndefined();

    const own = await request(app).get(`/api/owner/surveys/${publishedSurveyId}/summary`).set('Cookie', owner1Cookie);
    expect(own.status).toBe(200);
  });

  // ---- Respondent survey routes ----
  it('GET /api/surveys – anonymous 401, respondent 200, owner 403', async () => {
    const anon = await request(app).get('/api/surveys');
    expect(anon.status).toBe(401);

    // Need a fresh respondent cookie because the one from beforeEach was used to submit
    const resp = await request(app).get('/api/surveys').set('Cookie', await loginUser(RESPONDENT2));
    expect(resp.status).toBe(200);

    const own = await request(app).get('/api/surveys').set('Cookie', owner1Cookie);
    expect(own.status).toBe(403);
  });

  it('GET /api/surveys/:id – anonymous 401, respondent 200, owner 403', async () => {
    const anon = await request(app).get(`/api/surveys/${publishedSurveyId}`);
    expect(anon.status).toBe(401);

    const resp = await request(app).get(`/api/surveys/${publishedSurveyId}`).set('Cookie', await loginUser(RESPONDENT2));
    expect(resp.status).toBe(200);

    const own = await request(app).get(`/api/surveys/${publishedSurveyId}`).set('Cookie', owner1Cookie);
    expect(own.status).toBe(403);
  });

  it('POST /api/surveys/:id/responses – anonymous 401, owner 403, respondent 201', async () => {
    const survey = await prisma.survey.findFirst({
      where: { title: 'Course CPE334 Feedback', status: 'published' },
      include: { questions: { include: { options: true } } },
    });
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');
    const body = {
      answers: [
        { questionId: qSingle.id, optionId: qSingle.options[0].id },
        { questionId: qRating.id, ratingValue: 3 },
      ],
    };

    const anon = await request(app).post(`/api/surveys/${publishedSurveyId}/responses`).send(body);
    expect(anon.status).toBe(401);

    const own = await request(app).post(`/api/surveys/${publishedSurveyId}/responses`).set('Cookie', owner1Cookie).send(body);
    expect(own.status).toBe(403);

    // respondent2 (not yet answered)
    const r2Cookie = await loginUser(RESPONDENT2);
    const resp = await request(app).post(`/api/surveys/${publishedSurveyId}/responses`).set('Cookie', r2Cookie).send(body);
    expect(resp.status).toBe(201);
  });

  // ---- Response routes ----
  it('GET /api/responses/:id – anonymous 401, owner 403, other-respondent 403, own-respondent 200', async () => {
    const anon = await request(app).get(`/api/responses/${respondent1ResponseId}`);
    expect(anon.status).toBe(401);

    const own = await request(app).get(`/api/responses/${respondent1ResponseId}`).set('Cookie', owner1Cookie);
    expect(own.status).toBe(403);

    const otherResp = await request(app).get(`/api/responses/${respondent1ResponseId}`).set('Cookie', await loginUser(RESPONDENT2));
    expect(otherResp.status).toBe(403);
    expect(otherResp.body.answers).toBeUndefined();

    // Re-login respondent1 (previous cookie consumed for submission)
    const r1Cookie = await loginUser(RESPONDENT1);
    const selfResp = await request(app).get(`/api/responses/${respondent1ResponseId}`).set('Cookie', r1Cookie);
    expect(selfResp.status).toBe(200);
  });

  // ---- Denied responses carry no private data ----
  it('all denied responses carry no private data fields', async () => {
    const deniedResponses = [
      await request(app).get('/api/owner/surveys'),
      await request(app).get(`/api/owner/surveys/${draftSurveyId}`).set('Cookie', owner2Cookie),
      await request(app).get(`/api/surveys/${publishedSurveyId}`).set('Cookie', owner1Cookie),
      await request(app).get(`/api/responses/${respondent1ResponseId}`).set('Cookie', owner1Cookie),
    ];
    for (const res of deniedResponses) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expectNoPrivateData(res.body);
      // Must not contain survey content or response data
      expect(res.body.survey).toBeUndefined();
      expect(res.body.response).toBeUndefined();
    }
  });
});

/* ================================================================== */
/*  TC-INT-02  Full Data Journey                                      */
/* ================================================================== */
describe('TC-INT-02: Full Data Journey – create → publish → answer → summary', () => {
  it('owner creates survey → publishes → respondent answers → reads response → owner reads summary with count=1', async () => {
    const ownerCookie = await loginUser(OWNER1);

    // 1. Owner creates survey
    const createRes = await request(app)
      .post('/api/owner/surveys')
      .set('Cookie', ownerCookie)
      .send({
        title: 'Integration Journey Survey',
        description: 'Full journey test',
        questions: [
          {
            position: 1,
            text: 'Pick a topic',
            type: 'single_choice',
            options: [
              { position: 1, label: 'Alpha' },
              { position: 2, label: 'Beta' },
            ],
          },
          {
            position: 2,
            text: 'Rate overall',
            type: 'rating',
          },
        ],
      });
    expect(createRes.status).toBe(201);
    const surveyId = createRes.body.survey.id;
    expect(createRes.body.survey.status).toBe('draft');

    // 2. Owner publishes
    const publishRes = await request(app)
      .post(`/api/owner/surveys/${surveyId}/publish`)
      .set('Cookie', ownerCookie);
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.survey.status).toBe('published');

    // 3. Respondent1 lists published surveys and sees it
    const r1Cookie = await loginUser(RESPONDENT1);
    const listRes = await request(app).get('/api/surveys').set('Cookie', r1Cookie);
    expect(listRes.status).toBe(200);
    const found = listRes.body.surveys.find((s) => s.id === surveyId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Integration Journey Survey');
    expect(found.myResponseId).toBeNull();

    // 4. Respondent1 answers
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { questions: { include: { options: true }, orderBy: { position: 'asc' } } },
    });
    const qChoice = survey.questions.find((q) => q.type === 'single_choice');
    const qRate = survey.questions.find((q) => q.type === 'rating');

    const submitRes = await request(app)
      .post(`/api/surveys/${surveyId}/responses`)
      .set('Cookie', r1Cookie)
      .send({
        answers: [
          { questionId: qChoice.id, optionId: qChoice.options[0].id },
          { questionId: qRate.id, ratingValue: 4 },
        ],
      });
    expect(submitRes.status).toBe(201);
    const responseId = submitRes.body.response.id;

    // 5. Respondent1 reads own response
    const readRes = await request(app)
      .get(`/api/responses/${responseId}`)
      .set('Cookie', r1Cookie);
    expect(readRes.status).toBe(200);
    expect(readRes.body.response.answers).toHaveLength(2);
    expect(readRes.body.response.surveyId).toBe(surveyId);

    // 6. Owner reads summary
    const summaryRes = await request(app)
      .get(`/api/owner/surveys/${surveyId}/summary`)
      .set('Cookie', ownerCookie);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.summary.responseCount).toBe(1);
    expect(summaryRes.body.summary.surveyId).toBe(surveyId);

    // Verify choice counts
    const choiceQ = summaryRes.body.summary.questions.find((q) => q.type === 'single_choice');
    expect(choiceQ.options.find((o) => o.label === 'Alpha').count).toBe(1);
    expect(choiceQ.options.find((o) => o.label === 'Beta').count).toBe(0);

    // Verify rating
    const ratingQ = summaryRes.body.summary.questions.find((q) => q.type === 'rating');
    expect(ratingQ.average).toBe(4);
    expect(ratingQ.distribution['4']).toBe(1);
  });
});

/* ================================================================== */
/*  TC-INT-03  Fresh DB Setup – migrate + seed + health               */
/* ================================================================== */
describe('TC-INT-03: Fresh DB Setup – migrate + seed + health check', () => {
  it('after resetAndSeed: app healthy, 4 users, 4 seed surveys', async () => {
    // Health
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');

    // 4 users
    const users = await prisma.user.findMany();
    expect(users).toHaveLength(4);
    expect(users.filter((u) => u.role === 'owner')).toHaveLength(2);
    expect(users.filter((u) => u.role === 'respondent')).toHaveLength(2);

    // 4 seed surveys
    const surveys = await prisma.survey.findMany();
    expect(surveys).toHaveLength(4);
    const titles = surveys.map((s) => s.title).sort();
    expect(titles).toContain('Course CPE334 Feedback');
    expect(titles).toContain('Quarterly Team Feedback');
    expect(titles).toContain('Past Semester Survey');
    expect(titles).toContain('Owner Two Private Survey');
  });
});

/* ================================================================== */
/*  TC-INT-04  Session Expiry & Logout Guard                          */
/* ================================================================== */
describe('TC-INT-04: Session Expiry & Logout Guard', () => {
  it('after logout, every protected endpoint returns 401', async () => {
    const ownerCookie = await loginUser(OWNER1);
    const respondentCookie = await loginUser(RESPONDENT1);

    // Logout both
    const logoutOwner = await request(app).post('/api/auth/logout').set('Cookie', ownerCookie);
    expect(logoutOwner.status).toBe(204);
    const logoutResp = await request(app).post('/api/auth/logout').set('Cookie', respondentCookie);
    expect(logoutResp.status).toBe(204);

    // All protected endpoints should return 401 with the old cookies
    const endpoints = [
      { method: 'get', path: '/api/auth/me' },
      { method: 'get', path: '/api/owner/surveys' },
      { method: 'get', path: '/api/surveys' },
    ];

    for (const ep of endpoints) {
      const resOwner = await request(app)[ep.method](ep.path).set('Cookie', ownerCookie);
      expect(resOwner.status).toBe(401);
      expect(resOwner.body.error.code).toBe('UNAUTHENTICATED');

      const resResp = await request(app)[ep.method](ep.path).set('Cookie', respondentCookie);
      expect(resResp.status).toBe(401);
      expect(resResp.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('expired session (expiresAt in the past) returns 401 on every protected endpoint', async () => {
    const ownerCookie = await loginUser(OWNER1);
    const respondentCookie = await loginUser(RESPONDENT1);

    // Expire all sessions
    await prisma.session.updateMany({
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const endpoints = [
      { method: 'get', path: '/api/auth/me' },
      { method: 'get', path: '/api/owner/surveys' },
      { method: 'get', path: '/api/surveys' },
    ];

    for (const ep of endpoints) {
      const resOwner = await request(app)[ep.method](ep.path).set('Cookie', ownerCookie);
      expect(resOwner.status).toBe(401);

      const resResp = await request(app)[ep.method](ep.path).set('Cookie', respondentCookie);
      expect(resResp.status).toBe(401);
    }
  });
});

/* ================================================================== */
/*  TC-INT-05  Cross-Respondent Concurrency                           */
/* ================================================================== */
describe('TC-INT-05: Cross-Respondent Concurrency – parallel submissions from 2 respondents', () => {
  it('respondent1 and respondent2 each submit 3 times in parallel → exactly 1 per respondent (2 rows total)', async () => {
    const cookie1 = await loginUser(RESPONDENT1);
    const cookie2 = await loginUser(RESPONDENT2);

    const survey = await prisma.survey.findFirst({
      where: { title: 'Course CPE334 Feedback', status: 'published' },
      include: { questions: { include: { options: true }, orderBy: { position: 'asc' } } },
    });
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    const makeBody = () => ({
      answers: [
        { questionId: qSingle.id, optionId: qSingle.options[0].id },
        { questionId: qRating.id, ratingValue: 3 },
      ],
    });

    const submissions = [
      ...Array.from({ length: 3 }, () =>
        request(app).post(`/api/surveys/${survey.id}/responses`).set('Cookie', cookie1).send(makeBody()),
      ),
      ...Array.from({ length: 3 }, () =>
        request(app).post(`/api/surveys/${survey.id}/responses`).set('Cookie', cookie2).send(makeBody()),
      ),
    ];

    const results = await Promise.all(submissions);
    const statuses = results.map((r) => r.status);

    const count201 = statuses.filter((s) => s === 201).length;
    const count409 = statuses.filter((s) => s === 409).length;

    // Exactly 2 successes (one per respondent) and 4 duplicates
    expect(count201).toBe(2);
    expect(count409).toBe(4);

    const rowCount = await prisma.response.count({ where: { surveyId: survey.id } });
    expect(rowCount).toBe(2);
  });
});

/* ================================================================== */
/*  TC-INT-06  Fault Injection – Error Masking                        */
/* ================================================================== */
describe('TC-INT-06: Fault Injection – error masking in 500 responses', () => {
  it('injected fault → 500 INTERNAL_ERROR, body has no stack/SQL/path', async () => {
    const ownerCookie = await loginUser(OWNER1);

    // Inject fault: spy on prisma.survey.findMany to throw
    const originalFn = prisma.survey.findMany.bind(prisma.survey);
    vi.spyOn(prisma.survey, 'findMany').mockImplementation(async () => {
      throw new Error('Injected disk I/O fault – SELECT surveys FROM pg_catalog.tables');
    });

    const res = await request(app)
      .get('/api/owner/surveys')
      .set('Cookie', ownerCookie);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Internal server error');

    // Must NOT leak internals
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/pg_catalog|disk I\/O|SELECT|stack|node_modules|\.js/i);
    expect(raw).not.toMatch(/\\\\|\/src\//i);
  });
});

/* ================================================================== */
/*  TC-INT-07  Privacy in Summary                                     */
/* ================================================================== */
describe('TC-INT-07: Privacy in Summary – no identifiers in summary JSON', () => {
  it('respondent1 and respondent2 submit different answers → owner summary has correct counts but no identifiers', async () => {
    const r1Cookie = await loginUser(RESPONDENT1);
    const r2Cookie = await loginUser(RESPONDENT2);
    const ownerCookie = await loginUser(OWNER1);

    const survey = await prisma.survey.findFirst({
      where: { title: 'Course CPE334 Feedback', status: 'published' },
      include: { questions: { include: { options: true }, orderBy: { position: 'asc' } } },
    });
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    // Respondent1 picks option 0, rates 3
    const r1Res = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', r1Cookie)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[0].id },
          { questionId: qRating.id, ratingValue: 3 },
        ],
      });
    expect(r1Res.status).toBe(201);

    // Respondent2 picks option 1, rates 5
    const r2Res = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', r2Cookie)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[1].id },
          { questionId: qRating.id, ratingValue: 5 },
        ],
      });
    expect(r2Res.status).toBe(201);

    // Owner reads summary
    const summaryRes = await request(app)
      .get(`/api/owner/surveys/${survey.id}/summary`)
      .set('Cookie', ownerCookie);
    expect(summaryRes.status).toBe(200);

    const summary = summaryRes.body.summary;
    expect(summary.responseCount).toBe(2);

    // Verify counts match both responses
    const choiceQ = summary.questions.find((q) => q.type === 'single_choice');
    const totalChoiceVotes = choiceQ.options.reduce((sum, o) => sum + o.count, 0);
    expect(totalChoiceVotes).toBe(2);
    expect(choiceQ.options[0].count).toBe(1); // option 0
    expect(choiceQ.options[1].count).toBe(1); // option 1

    const ratingQ = summary.questions.find((q) => q.type === 'rating');
    expect(ratingQ.average).toBe(4); // (3+5)/2 = 4

    // Recursive key check: no identity keys in entire JSON
    const allKeys = collectKeys(summary);
    for (const forbidden of FORBIDDEN_IDENTITY_KEYS) {
      expect(allKeys.has(forbidden)).toBe(false);
    }
  });
});

