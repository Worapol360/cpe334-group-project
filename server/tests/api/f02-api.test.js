import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma, resetAndSeed } from '../harness/db.js';
import { createApp } from '../../src/app.js';

const app = createApp();
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'change-me';
const OWNER1 = 'owner1@example.test';
const OWNER2 = 'owner2@example.test';
const RESPONDENT1 = 'respondent1@example.test';

function cookieFrom(res) {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw[0] : raw;
}

async function loginUser(email, password = SEED_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return cookieFrom(res);
}

const sampleSurveyBody = {
  title: 'Course CPE334 Midterm Feedback',
  description: 'Tell us how Sprint 1 went',
  questions: [
    {
      text: 'Which topic was most helpful?',
      type: 'single_choice',
      options: ['Git & GitHub', 'TDD & Testing', 'Docker & CI/CD'],
    },
    {
      text: 'Rate the difficulty level (1-5)',
      type: 'rating',
    },
  ],
};

beforeEach(async () => {
  await resetAndSeed();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('F-02 Survey Creation API Tests', () => {
  it('TC-F02-01: owner posts a valid survey -> 201 draft, owner_id = session user, rows persisted', async () => {
    const cookie = await loginUser(OWNER1);
    const owner1User = await prisma.user.findUnique({ where: { email: OWNER1 } });

    const res = await request(app)
      .post('/api/owner/surveys')
      .set('Cookie', cookie)
      .send(sampleSurveyBody);

    expect(res.status).toBe(201);
    expect(res.body.survey).toBeDefined();
    expect(res.body.survey.id).toEqual(expect.any(Number));
    expect(res.body.survey.title).toBe(sampleSurveyBody.title);
    expect(res.body.survey.description).toBe(sampleSurveyBody.description);
    expect(res.body.survey.status).toBe('draft');
    expect(res.body.survey.mode).toBe('identified');
    expect(res.body.survey.ownerId).toBe(owner1User.id);
    expect(res.body.survey.questions).toHaveLength(2);

    // Verify database persistence directly
    const dbSurvey = await prisma.survey.findUnique({
      where: { id: res.body.survey.id },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: { options: { orderBy: { position: 'asc' } } },
        },
      },
    });

    expect(dbSurvey).not.toBeNull();
    expect(dbSurvey.ownerId).toBe(owner1User.id);
    expect(dbSurvey.status).toBe('draft');
    expect(dbSurvey.questions[0].type).toBe('single_choice');
    expect(dbSurvey.questions[0].options).toHaveLength(3);
    expect(dbSurvey.questions[1].type).toBe('rating');
    expect(dbSurvey.questions[1].options).toHaveLength(0);
  });

  it('TC-F02-02: GET /api/owner/surveys/:id returns persisted survey with ordered questions and options', async () => {
    const cookie = await loginUser(OWNER1);

    const createRes = await request(app)
      .post('/api/owner/surveys')
      .set('Cookie', cookie)
      .send(sampleSurveyBody);

    const surveyId = createRes.body.survey.id;

    const detailRes = await request(app)
      .get(`/api/owner/surveys/${surveyId}`)
      .set('Cookie', cookie);

    expect(detailRes.status).toBe(200);
    const survey = detailRes.body.survey;
    expect(survey.id).toBe(surveyId);
    expect(survey.questions[0].position).toBe(1);
    expect(survey.questions[0].text).toBe('Which topic was most helpful?');
    expect(survey.questions[0].options[0].label).toBe('Git & GitHub');
    expect(survey.questions[0].options[0].position).toBe(1);
    expect(survey.questions[1].position).toBe(2);
    expect(survey.questions[1].text).toBe('Rate the difficulty level (1-5)');
  });

  it('TC-F02-03 (API part): rejects invalid title and does not store survey rows', async () => {
    const cookie = await loginUser(OWNER1);
    const initialCount = await prisma.survey.count();

    // Whitespace title
    const resWhitespace = await request(app)
      .post('/api/owner/surveys')
      .set('Cookie', cookie)
      .send({ ...sampleSurveyBody, title: '    ' });

    expect(resWhitespace.status).toBe(422);
    expect(resWhitespace.body.error.code).toBe('VALIDATION_ERROR');

    // Overly long title (201 chars)
    const res201 = await request(app)
      .post('/api/owner/surveys')
      .set('Cookie', cookie)
      .send({ ...sampleSurveyBody, title: 'A'.repeat(201) });

    expect(res201.status).toBe(422);

    // Verify no rows were stored
    const finalCount = await prisma.survey.count();
    expect(finalCount).toBe(initialCount);
  });

  it('TC-F02-08: GET /api/owner/surveys lists only the surveys belonging to current owner', async () => {
    const cookieOwner1 = await loginUser(OWNER1);
    const owner1User = await prisma.user.findUnique({ where: { email: OWNER1 } });
    const owner2User = await prisma.user.findUnique({ where: { email: OWNER2 } });

    const res = await request(app)
      .get('/api/owner/surveys')
      .set('Cookie', cookieOwner1);

    expect(res.status).toBe(200);
    expect(res.body.surveys).toBeDefined();
    expect(Array.isArray(res.body.surveys)).toBe(true);

    // From seed: owner1 has S-DRAFT, S-PUB, S-CLOSED; owner2 has S-OWNER2-DRAFT
    const listTitles = res.body.surveys.map((s) => s.title);
    expect(listTitles).toContain('Quarterly Team Feedback');
    expect(listTitles).not.toContain('Owner Two Private Survey');
  });

  it('TC-F02-09: owner1 requesting owner2 survey returns 403 Forbidden with no survey fields', async () => {
    const cookieOwner1 = await loginUser(OWNER1);
    const owner2User = await prisma.user.findUnique({ where: { email: OWNER2 } });
    const owner2Survey = await prisma.survey.findFirst({
      where: { ownerId: owner2User.id },
    });

    const res = await request(app)
      .get(`/api/owner/surveys/${owner2Survey.id}`)
      .set('Cookie', cookieOwner1);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.survey).toBeUndefined();
    expect(res.body.questions).toBeUndefined();
  });

  it('TC-F02-10: respondent calling owner survey endpoints returns 403, unauthenticated returns 401', async () => {
    // Unauthenticated (no cookie)
    const unauthPost = await request(app)
      .post('/api/owner/surveys')
      .send(sampleSurveyBody);
    expect(unauthPost.status).toBe(401);
    expect(unauthPost.body.error.code).toBe('UNAUTHENTICATED');

    const unauthGet = await request(app).get('/api/owner/surveys');
    expect(unauthGet.status).toBe(401);

    // Respondent role
    const respondentCookie = await loginUser(RESPONDENT1);
    const respondentPost = await request(app)
      .post('/api/owner/surveys')
      .set('Cookie', respondentCookie)
      .send(sampleSurveyBody);
    expect(respondentPost.status).toBe(403);
    expect(respondentPost.body.error.code).toBe('FORBIDDEN');

    const respondentGet = await request(app)
      .get('/api/owner/surveys')
      .set('Cookie', respondentCookie);
    expect(respondentGet.status).toBe(403);
  });

  it('TC-F02-11: ignores client-supplied ownerId and status (always creates draft for session user)', async () => {
    const cookieOwner1 = await loginUser(OWNER1);
    const owner1User = await prisma.user.findUnique({ where: { email: OWNER1 } });
    const owner2User = await prisma.user.findUnique({ where: { email: OWNER2 } });

    const maliciousBody = {
      ...sampleSurveyBody,
      ownerId: owner2User.id,
      status: 'published',
      mode: 'anonymous',
    };

    const res = await request(app)
      .post('/api/owner/surveys')
      .set('Cookie', cookieOwner1)
      .send(maliciousBody);

    expect(res.status).toBe(201);
    expect(res.body.survey.ownerId).toBe(owner1User.id);
    expect(res.body.survey.status).toBe('draft');
    expect(res.body.survey.mode).toBe('identified');
  });

  it('TC-F02-12: transaction rollback on error leaves zero orphaned rows', async () => {
    const cookieOwner1 = await loginUser(OWNER1);
    const initialSurveys = await prisma.survey.count();
    const initialQuestions = await prisma.question.count();

    // Mock tx.question.create to throw on 2nd question
    const originalTransaction = prisma.$transaction.bind(prisma);
    let callCount = 0;

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
      return originalTransaction(async (tx) => {
        const originalQuestionCreate = tx.question.create.bind(tx);
        tx.question.create = async (args) => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Database disk fault on second question insert');
          }
          return originalQuestionCreate(args);
        };
        return callback(tx);
      });
    });

    const res = await request(app)
      .post('/api/owner/surveys')
      .set('Cookie', cookieOwner1)
      .send(sampleSurveyBody);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');

    // Verify rollback: count of surveys and questions should be identical to initial
    const finalSurveys = await prisma.survey.count();
    const finalQuestions = await prisma.question.count();

    expect(finalSurveys).toBe(initialSurveys);
    expect(finalQuestions).toBe(initialQuestions);
  });

  it('TC-F02-02 (edge case): non-numeric or alphanumeric ID like 12abc returns 404 NOT_FOUND', async () => {
    const cookie = await loginUser(OWNER1);

    const res = await request(app)
      .get('/api/owner/surveys/12abc')
      .set('Cookie', cookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

