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

