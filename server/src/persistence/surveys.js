/**
 * Surveys persistence layer (F-02)
 *
 * Implements atomic transactional creation of surveys with questions and options,
 * and scoped owner queries.
 */

export async function createSurveyWithQuestions(prisma, { ownerId, title, description, questions }) {
  return prisma.$transaction(async (tx) => {
    // 1. Create survey record (server sets status='draft', mode='identified', ownerId)
    const survey = await tx.survey.create({
      data: {
        ownerId,
        title,
        description: description || null,
        status: 'draft',
        mode: 'identified',
      },
    });

    // 2. Create questions and options
    for (const q of questions) {
      const createdQ = await tx.question.create({
        data: {
          surveyId: survey.id,
          position: q.position,
          text: q.text,
          type: q.type,
        },
      });

      if (q.type === 'single_choice' && Array.isArray(q.options) && q.options.length > 0) {
        for (const opt of q.options) {
          await tx.questionOption.create({
            data: {
              questionId: createdQ.id,
              position: opt.position,
              label: opt.label,
            },
          });
        }
      }
    }

    // 3. Return full survey with questions and options ordered by position
    return tx.survey.findUnique({
      where: { id: survey.id },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: {
            options: {
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });
  });
}

export async function listSurveysByOwner(prisma, ownerId) {
  return prisma.survey.findMany({
    where: { ownerId },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findSurveyById(prisma, id) {
  return prisma.survey.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: {
          options: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });
}

export async function listPublishedSurveys(prisma, respondentId = null) {
  const surveys = await prisma.survey.findMany({
    where: { status: 'published' },
    select: {
      id: true,
      title: true,
      description: true,
      responses: respondentId
        ? {
            where: { respondentId },
            select: { id: true },
          }
        : false,
    },
    orderBy: { createdAt: 'desc' },
  });

  return surveys.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    myResponseId: s.responses && s.responses.length > 0 ? s.responses[0].id : null,
  }));
}

export async function findPublishedSurveyById(prisma, id) {
  return prisma.survey.findFirst({
    where: { id, status: 'published' },
    select: {
      id: true,
      title: true,
      description: true,
      questions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          position: true,
          text: true,
          type: true,
          options: {
            orderBy: { position: 'asc' },
            select: { id: true, label: true },
          },
        },
      },
    },
  });
}

export async function publishSurveyIfDraft(prisma, id, publishedAt) {
  const result = await prisma.survey.updateMany({
    where: { id, status: 'draft' },
    data: { status: 'published', publishedAt },
  });
  return result.count === 1;
}
