import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma, resetAndSeed } from '../harness/db.js';
import { createApp } from '../../src/app.js';

const app = createApp();
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'change-me';
const OWNER1 = 'owner1@example.test';
const RESPONDENT1 = 'respondent1@example.test';
const RESPONDENT2 = 'respondent2@example.test';

function cookieFrom(res) {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw[0] : raw;
}

async function loginUser(email, password = SEED_PASSWORD) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return cookieFrom(res);
}

async function getPublishedSurveyWithQuestions() {
  const survey = await prisma.survey.findFirst({
    where: { title: 'Course CPE334 Feedback', status: 'published' },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: { options: { orderBy: { position: 'asc' } } },
      },
    },
  });
  return survey;
}

beforeEach(async () => {
  await resetAndSeed();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('F-04 Response Submission and Duplicate Prevention API Tests', () => {
  it('TC-F04-01: respondent1 submits valid response to published survey -> 201; 1 response + N answers; respondent_id = respondent1', async () => {
    const cookie = await loginUser(RESPONDENT1);
    const respondent = await prisma.user.findUnique({ where: { email: RESPONDENT1 } });
    const survey = await getPublishedSurveyWithQuestions();

    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    const validSubmission = {
      answers: [
        { questionId: qSingle.id, optionId: qSingle.options[0].id },
        { questionId: qRating.id, ratingValue: 5 },
      ],
    };

    const res = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send(validSubmission);

    expect(res.status).toBe(201);
    expect(res.body.response).toBeDefined();
    expect(res.body.response.id).toEqual(expect.any(Number));
    expect(res.body.response.surveyId).toBe(survey.id);
    expect(res.body.response.submittedAt).toBeDefined();

    // Verify DB persistence directly
    const storedResponse = await prisma.response.findUnique({
      where: { id: res.body.response.id },
      include: { answers: true },
    });
    expect(storedResponse).not.toBeNull();
    expect(storedResponse.respondentId).toBe(respondent.id);
    expect(storedResponse.surveyId).toBe(survey.id);
    expect(storedResponse.answers).toHaveLength(2);
  });

  it('TC-F04-02: GET /api/responses/:id as respondent1 -> 200; answers equal submitted', async () => {
    const cookie = await loginUser(RESPONDENT1);
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    const createRes = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[1].id },
          { questionId: qRating.id, ratingValue: 4 },
        ],
      });
    expect(createRes.status).toBe(201);
    const responseId = createRes.body.response.id;

    const getRes = await request(app)
      .get(`/api/responses/${responseId}`)
      .set('Cookie', cookie);

    expect(getRes.status).toBe(200);
    expect(getRes.body.response).toBeDefined();
    expect(getRes.body.response.id).toBe(responseId);
    expect(getRes.body.response.surveyId).toBe(survey.id);
    expect(getRes.body.response.answers).toHaveLength(2);

    const ansChoice = getRes.body.response.answers.find((a) => a.questionId === qSingle.id);
    expect(ansChoice.optionId).toBe(qSingle.options[1].id);

    const ansRating = getRes.body.response.answers.find((a) => a.questionId === qRating.id);
    expect(ansRating.ratingValue).toBe(4);
  });

  it('TC-F04-03: respondent1 already answered -> POST again -> 409 DUPLICATE_RESPONSE; count = 1', async () => {
    const cookie = await loginUser(RESPONDENT1);
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    const body = {
      answers: [
        { questionId: qSingle.id, optionId: qSingle.options[0].id },
        { questionId: qRating.id, ratingValue: 5 },
      ],
    };

    // First submission
    const res1 = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send(body);
    expect(res1.status).toBe(201);

    // Second submission by same respondent to same survey
    const res2 = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send(body);

    expect(res2.status).toBe(409);
    expect(res2.body.error).toBeDefined();
    expect(res2.body.error.code).toBe('DUPLICATE_RESPONSE');

    // Verify row count remains exactly 1
    const count = await prisma.response.count({
      where: { surveyId: survey.id },
    });
    expect(count).toBe(1);
  });

  it('TC-F04-04: 5 parallel identical submissions -> exactly one 201, four 409; count = 1', async () => {
    const cookie = await loginUser(RESPONDENT1);
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    const body = {
      answers: [
        { questionId: qSingle.id, optionId: qSingle.options[0].id },
        { questionId: qRating.id, ratingValue: 5 },
      ],
    };

    const requests = Array.from({ length: 5 }, () =>
      request(app)
        .post(`/api/surveys/${survey.id}/responses`)
        .set('Cookie', cookie)
        .send(body)
    );

    const results = await Promise.all(requests);
    const statuses = results.map((r) => r.status);

    const count201 = statuses.filter((s) => s === 201).length;
    const count409 = statuses.filter((s) => s === 409).length;

    expect(count201).toBe(1);
    expect(count409).toBe(4);

    const count = await prisma.response.count({
      where: { surveyId: survey.id },
    });
    expect(count).toBe(1);
  });

  it('TC-F04-05: draft, closed, unknown survey -> 409 SURVEY_NOT_OPEN, 409 SURVEY_NOT_OPEN, 404 NOT_FOUND; zero rows', async () => {
    const cookie = await loginUser(RESPONDENT1);

    const draftSurvey = await prisma.survey.findFirst({
      where: { title: 'Quarterly Team Feedback', status: 'draft' },
      include: { questions: { include: { options: true } } },
    });
    const closedSurvey = await prisma.survey.findFirst({
      where: { title: 'Past Semester Survey', status: 'closed' },
      include: { questions: { include: { options: true } } },
    });

    // 1. Draft survey -> 409 SURVEY_NOT_OPEN
    const resDraft = await request(app)
      .post(`/api/surveys/${draftSurvey.id}/responses`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: draftSurvey.questions[0].id, optionId: draftSurvey.questions[0].options[0].id },
          { questionId: draftSurvey.questions[1].id, ratingValue: 3 },
        ],
      });
    expect(resDraft.status).toBe(409);
    expect(resDraft.body.error?.code).toBe('SURVEY_NOT_OPEN');

    // 2. Closed survey -> 409 SURVEY_NOT_OPEN
    const resClosed = await request(app)
      .post(`/api/surveys/${closedSurvey.id}/responses`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: closedSurvey.questions[0].id, optionId: closedSurvey.questions[0].options[0].id },
          { questionId: closedSurvey.questions[1].id, ratingValue: 3 },
        ],
      });
    expect(resClosed.status).toBe(409);
    expect(resClosed.body.error?.code).toBe('SURVEY_NOT_OPEN');

    // 3. Unknown survey id -> 404 NOT_FOUND
    const resUnknown = await request(app)
      .post('/api/surveys/999999/responses')
      .set('Cookie', cookie)
      .send({
        answers: [{ questionId: 1, optionId: 1 }],
      });
    expect(resUnknown.status).toBe(404);

    const count = await prisma.response.count();
    expect(count).toBe(0);
  });

  it('TC-F04-07: missing answer for a question via API -> 422 VALIDATION_ERROR; zero rows', async () => {
    const cookie = await loginUser(RESPONDENT1);
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');

    // Omit question 2
    const res = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send({
        answers: [{ questionId: qSingle.id, optionId: qSingle.options[0].id }],
      });

    expect(res.status).toBe(422);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');

    const count = await prisma.response.count();
    expect(count).toBe(0);
  });

  it('TC-F04-10: foreign option, foreign question, duplicate answer via API -> 422; zero rows', async () => {
    const cookie = await loginUser(RESPONDENT1);
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    // 1. Foreign option id (999999)
    const resOpt = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: 999999 },
          { questionId: qRating.id, ratingValue: 4 },
        ],
      });
    expect(resOpt.status).toBe(422);

    // 2. Foreign question id (999999)
    const resQ = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[0].id },
          { questionId: qRating.id, ratingValue: 4 },
          { questionId: 999999, ratingValue: 5 },
        ],
      });
    expect(resQ.status).toBe(422);

    // 3. Two answers for one question
    const resDup = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[0].id },
          { questionId: qSingle.id, optionId: qSingle.options[1].id },
          { questionId: qRating.id, ratingValue: 4 },
        ],
      });
    expect(resDup.status).toBe(422);

    const count = await prisma.response.count();
    expect(count).toBe(0);
  });

  it('TC-F04-11: owner1 session / no session -> POST -> 403 / 401; zero rows', async () => {
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    const body = {
      answers: [
        { questionId: qSingle.id, optionId: qSingle.options[0].id },
        { questionId: qRating.id, ratingValue: 5 },
      ],
    };

    // Anonymous -> 401
    const resAnon = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .send(body);
    expect(resAnon.status).toBe(401);

    // Owner -> 403
    const ownerCookie = await loginUser(OWNER1);
    const resOwner = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', ownerCookie)
      .send(body);
    expect(resOwner.status).toBe(403);

    const count = await prisma.response.count();
    expect(count).toBe(0);
  });

  it('TC-F04-12: response of respondent1; session respondent2 -> GET by id -> 403; body lacks answers', async () => {
    const cookieR1 = await loginUser(RESPONDENT1);
    const cookieR2 = await loginUser(RESPONDENT2);
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    const createRes = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookieR1)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[0].id },
          { questionId: qRating.id, ratingValue: 5 },
        ],
      });
    expect(createRes.status).toBe(201);
    const responseId = createRes.body.response.id;

    const res = await request(app)
      .get(`/api/responses/${responseId}`)
      .set('Cookie', cookieR2);

    expect(res.status).toBe(403);
    expect(res.body.response).toBeUndefined();
    expect(res.body.answers).toBeUndefined();
  });

  it('TC-F04-13: owner1 session -> GET respondent1 response -> 403', async () => {
    const cookieR1 = await loginUser(RESPONDENT1);
    const ownerCookie = await loginUser(OWNER1);
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    const createRes = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookieR1)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[0].id },
          { questionId: qRating.id, ratingValue: 5 },
        ],
      });
    expect(createRes.status).toBe(201);
    const responseId = createRes.body.response.id;

    const res = await request(app)
      .get(`/api/responses/${responseId}`)
      .set('Cookie', ownerCookie);

    expect(res.status).toBe(403);
  });

  it('TC-F04-14: body contains respondentId=respondent2 -> POST as respondent1 -> stored respondent = respondent1', async () => {
    const cookieR1 = await loginUser(RESPONDENT1);
    const respondent1 = await prisma.user.findUnique({ where: { email: RESPONDENT1 } });
    const respondent2 = await prisma.user.findUnique({ where: { email: RESPONDENT2 } });
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    const res = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookieR1)
      .send({
        respondentId: respondent2.id, // Ignored
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[0].id },
          { questionId: qRating.id, ratingValue: 4 },
        ],
      });

    expect(res.status).toBe(201);

    const storedResponse = await prisma.response.findUnique({
      where: { id: res.body.response.id },
    });
    expect(storedResponse.respondentId).toBe(respondent1.id);
    expect(storedResponse.respondentId).not.toBe(respondent2.id);
  });

  it('TC-F04-15: fault injected on 2nd answer insert -> safe error; zero response rows', async () => {
    const cookie = await loginUser(RESPONDENT1);
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    // Intercept answer creation on transaction client
    let answerCreateCalls = 0;
    const originalAnswerCreate = prisma.answer.create;

    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb) => {
      if (typeof cb === 'function') {
        const txProxy = new Proxy(prisma, {
          get(target, prop) {
            if (prop === 'answer') {
              return {
                ...target.answer,
                create: async (args) => {
                  answerCreateCalls++;
                  if (answerCreateCalls === 2) {
                    throw new Error('Database disk fault on second answer insert');
                  }
                  return target.answer.create(args);
                },
              };
            }
            return target[prop];
          },
        });
        return cb(txProxy);
      }
      return cb;
    });

    const res = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[0].id },
          { questionId: qRating.id, ratingValue: 5 },
        ],
      });

    // Should return safe error (500 or error envelope)
    expect(res.status).toBe(500);

    // Verify 0 response rows and 0 answer rows remain in database
    const responseCount = await prisma.response.count();
    const answerCount = await prisma.answer.count();
    expect(responseCount).toBe(0);
    expect(answerCount).toBe(0);
  });

  it('TC-F04-17: respondent1 answered S-PUB -> GET /api/surveys -> item has myResponseId not null; other surveys null', async () => {
    const cookie = await loginUser(RESPONDENT1);
    const survey = await getPublishedSurveyWithQuestions();
    const qSingle = survey.questions.find((q) => q.type === 'single_choice');
    const qRating = survey.questions.find((q) => q.type === 'rating');

    // Submit answer to S-PUB
    const postRes = await request(app)
      .post(`/api/surveys/${survey.id}/responses`)
      .set('Cookie', cookie)
      .send({
        answers: [
          { questionId: qSingle.id, optionId: qSingle.options[0].id },
          { questionId: qRating.id, ratingValue: 5 },
        ],
      });
    expect(postRes.status).toBe(201);
    const createdId = postRes.body.response.id;

    // GET /api/surveys as respondent1
    const res = await request(app)
      .get('/api/surveys')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.surveys).toBeDefined();

    const pubItem = res.body.surveys.find((s) => s.id === survey.id);
    expect(pubItem).toBeDefined();
    expect(pubItem.myResponseId).toBe(createdId);

    // As respondent2 (who hasn't answered)
    const cookieR2 = await loginUser(RESPONDENT2);
    const resR2 = await request(app)
      .get('/api/surveys')
      .set('Cookie', cookieR2);

    expect(resR2.status).toBe(200);
    const pubItemR2 = resR2.body.surveys.find((s) => s.id === survey.id);
    expect(pubItemR2.myResponseId).toBeNull();
  });
});
