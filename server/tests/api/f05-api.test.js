import { afterAll, beforeEach, describe, expect, it } from 'vitest';
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
const RESPONDENT3 = 'respondent3@example.test';

const FORBIDDEN_KEYS = [
  'respondentId',
  'email',
  'displayName',
  'responseId',
  'answers',
  'userId',
];

function cookieFrom(res) {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw[0] : raw;
}

async function loginUser(email, password = SEED_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return cookieFrom(res);
}

async function createThirdRespondent() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: RESPONDENT3 },
    update: { displayName: 'Respondent Three', role: 'respondent', passwordHash },
    create: {
      email: RESPONDENT3,
      displayName: 'Respondent Three',
      role: 'respondent',
      passwordHash,
    },
  });
}

async function createFixtureSurvey() {
  const owner1 = await prisma.user.findUnique({ where: { email: OWNER1 } });
  return prisma.survey.create({
    data: {
      ownerId: owner1.id,
      title: 'F-05 Fixture Survey',
      description: 'Single choice (Git, Testing, CI/CD) + rating aggregate fixture',
      status: 'published',
      mode: 'identified',
      publishedAt: new Date(),
      questions: {
        create: [
          {
            position: 1,
            text: 'Pick the best topic',
            type: 'single_choice',
            options: {
              create: [
                { position: 1, label: 'Git' },
                { position: 2, label: 'Testing' },
                { position: 3, label: 'CI/CD' },
              ],
            },
          },
          {
            position: 2,
            text: 'Rate the lab',
            type: 'rating',
          },
        ],
      },
    },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: { options: { orderBy: { position: 'asc' } } },
      },
    },
  });
}

async function submitResponse(cookie, survey, { label, rating }) {
  const qSingle = survey.questions.find((q) => q.type === 'single_choice');
  const qRating = survey.questions.find((q) => q.type === 'rating');
  const option = qSingle.options.find((o) => o.label === label);
  const res = await request(app)
    .post(`/api/surveys/${survey.id}/responses`)
    .set('Cookie', cookie)
    .send({
      answers: [
        { questionId: qSingle.id, optionId: option.id },
        { questionId: qRating.id, ratingValue: rating },
      ],
    });
  expect(res.status).toBe(201);
  return res.body.response;
}

async function storeThreeResponseFixture() {
  const survey = await createFixtureSurvey();
  const cookie1 = await loginUser(RESPONDENT1);
  const cookie2 = await loginUser(RESPONDENT2);
  await createThirdRespondent();
  const cookie3 = await loginUser(RESPONDENT3);

  await submitResponse(cookie1, survey, { label: 'Git', rating: 3 });
  await submitResponse(cookie2, survey, { label: 'Git', rating: 4 });
  await submitResponse(cookie3, survey, { label: 'Testing', rating: 5 });
  return survey;
}

async function getSummary(surveyId, cookie) {
  const req = request(app).get(`/api/owner/surveys/${surveyId}/summary`);
  if (cookie) req.set('Cookie', cookie);
  return req;
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

beforeEach(async () => {
  await resetAndSeed();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('F-05 Owner Aggregate Summary API Tests', () => {
  it('TC-F05-02: 3-response fixture stored via the real tables -> GET summary as owner -> 200 with the TC-F05-01 values', async () => {
    const survey = await storeThreeResponseFixture();
    const ownerCookie = await loginUser(OWNER1);

    const res = await getSummary(survey.id, ownerCookie);

    expect(res.status).toBe(200);
    const summary = res.body.summary;
    expect(summary).toBeDefined();
    expect(summary.surveyId).toBe(survey.id);
    expect(summary.title).toBe('F-05 Fixture Survey');
    expect(summary.responseCount).toBe(3);
    expect(summary.questions).toHaveLength(2);

    const single = summary.questions.find((q) => q.type === 'single_choice');
    expect(single).toBeDefined();
    const byLabel = Object.fromEntries(single.options.map((o) => [o.label, o]));
    expect(byLabel.Git.count).toBe(2);
    expect(byLabel.Git.percent).toBe(66.7);
    expect(byLabel.Testing.count).toBe(1);
    expect(byLabel.Testing.percent).toBe(33.3);
    expect(byLabel['CI/CD'].count).toBe(0);
    expect(byLabel['CI/CD'].percent).toBe(0);

    const rating = summary.questions.find((q) => q.type === 'rating');
    expect(rating).toBeDefined();
    expect(rating.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 });
    expect(rating.average).toBe(4);
  });

  it('TC-F05-05: S-PUB with no responses -> 200, zero counts, percent 0, average null; unknown survey id -> 404', async () => {
    const ownerCookie = await loginUser(OWNER1);
    const survey = await prisma.survey.findFirst({
      where: { title: 'Course CPE334 Feedback', status: 'published' },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: { options: { orderBy: { position: 'asc' } } },
        },
      },
    });
    expect(survey).not.toBeNull();

    const res = await getSummary(survey.id, ownerCookie);

    expect(res.status).toBe(200);
    const summary = res.body.summary;
    expect(summary).toBeDefined();
    expect(summary.responseCount).toBe(0);
    expect(summary.questions).toHaveLength(survey.questions.length);

    for (const question of summary.questions) {
      if (question.type === 'single_choice') {
        expect(question.options.length).toBeGreaterThan(0);
        for (const option of question.options) {
          expect(option.count).toBe(0);
          expect(option.percent).toBe(0);
        }
      } else if (question.type === 'rating') {
        expect(question.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
        expect(question.average).toBeNull();
      }
    }

    const unknown = await getSummary(999999, ownerCookie);
    expect(unknown.status).toBe(404);
    expect(unknown.body.summary).toBeUndefined();
  });

  it('TC-F05-06: owner2 on owner1 survey -> 403; respondent -> 403; no session -> 401; denied bodies contain no summary data', async () => {
    const survey = await prisma.survey.findFirst({
      where: { title: 'Course CPE334 Feedback', status: 'published' },
    });

    const owner2Cookie = await loginUser(OWNER2);
    const respondentCookie = await loginUser(RESPONDENT1);

    const asOwner2 = await getSummary(survey.id, owner2Cookie);
    const asRespondent = await getSummary(survey.id, respondentCookie);
    const asAnonymous = await getSummary(survey.id, null);

    expect(asOwner2.status).toBe(403);
    expect(asOwner2.body.error?.code).toBe('FORBIDDEN');
    expect(asRespondent.status).toBe(403);
    expect(asRespondent.body.error?.code).toBe('FORBIDDEN');
    expect(asAnonymous.status).toBe(401);
    expect(asAnonymous.body.error?.code).toBe('UNAUTHENTICATED');

    for (const denied of [asOwner2, asRespondent, asAnonymous]) {
      expect(denied.body.summary).toBeUndefined();
      const serialized = JSON.stringify(denied.body);
      for (const key of FORBIDDEN_KEYS) {
        expect(serialized).not.toContain(key);
      }
      expect(serialized).not.toContain('responseCount');
    }
  });

  it('TC-F05-07: summary of a survey with 2 responses -> recursive JSON keys contain no respondent identifiers or answer data', async () => {
    const survey = await createFixtureSurvey();
    const cookie1 = await loginUser(RESPONDENT1);
    const cookie2 = await loginUser(RESPONDENT2);
    await submitResponse(cookie1, survey, { label: 'Git', rating: 3 });
    await submitResponse(cookie2, survey, { label: 'Testing', rating: 5 });

    const ownerCookie = await loginUser(OWNER1);
    const res = await getSummary(survey.id, ownerCookie);

    expect(res.status).toBe(200);
    expect(res.body.summary.responseCount).toBe(2);

    const keys = collectKeys(res.body);
    for (const forbidden of FORBIDDEN_KEYS) {
      expect(keys.has(forbidden)).toBe(false);
    }
  });

  it('TC-F05-08: respondent2 submits through POST /api/surveys/{id}/responses -> summary count n+1 and distributions reflect the new answers', async () => {
    const survey = await createFixtureSurvey();
    const cookie1 = await loginUser(RESPONDENT1);
    await createThirdRespondent();
    const cookie3 = await loginUser(RESPONDENT3);
    await submitResponse(cookie1, survey, { label: 'Git', rating: 3 });
    await submitResponse(cookie3, survey, { label: 'Testing', rating: 4 });

    const ownerCookie = await loginUser(OWNER1);
    const before = await getSummary(survey.id, ownerCookie);
    expect(before.status).toBe(200);
    const n = before.body.summary.responseCount;
    expect(n).toBe(2);

    const cookie2 = await loginUser(RESPONDENT2);
    await submitResponse(cookie2, survey, { label: 'CI/CD', rating: 5 });

    const after = await getSummary(survey.id, ownerCookie);
    expect(after.status).toBe(200);
    const summary = after.body.summary;
    expect(summary.responseCount).toBe(n + 1);

    const single = summary.questions.find((q) => q.type === 'single_choice');
    const byLabel = Object.fromEntries(single.options.map((o) => [o.label, o]));
    expect(byLabel.Git.count).toBe(1);
    expect(byLabel.Testing.count).toBe(1);
    expect(byLabel['CI/CD'].count).toBe(1);

    const rating = summary.questions.find((q) => q.type === 'rating');
    expect(rating.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 });
    expect(rating.average).toBe(4);
  });
});
