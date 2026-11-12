import path from 'node:path';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

export const SEED_USERS = [
  { email: 'owner1@example.test', displayName: 'Owner One', role: 'owner' },
  { email: 'owner2@example.test', displayName: 'Owner Two', role: 'owner' },
  { email: 'respondent1@example.test', displayName: 'Respondent One', role: 'respondent' },
  { email: 'respondent2@example.test', displayName: 'Respondent Two', role: 'respondent' },
];

export async function seedUsers(client) {
  if (!config.seedPassword) {
    throw new Error('SEED_PASSWORD is not set; refusing to seed demo users without it');
  }
  const passwordHash = await bcrypt.hash(config.seedPassword, 10);
  for (const user of SEED_USERS) {
    await client.user.upsert({
      where: { email: user.email },
      update: { displayName: user.displayName, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
  }
  return SEED_USERS.length;
}

export async function seedSurveys(client) {
  const owner1 = await client.user.findUnique({ where: { email: 'owner1@example.test' } });
  const owner2 = await client.user.findUnique({ where: { email: 'owner2@example.test' } });

  if (!owner1 || !owner2) {
    throw new Error('Users must be seeded before surveys');
  }

  const demoSurveys = [
    {
      key: 'S-DRAFT',
      title: 'Quarterly Team Feedback',
      description: 'Internal team feedback survey (draft)',
      status: 'draft',
      publishedAt: null,
      ownerId: owner1.id,
    },
    {
      key: 'S-PUB',
      title: 'Course CPE334 Feedback',
      description: 'Midterm course evaluation (published)',
      status: 'published',
      publishedAt: new Date(),
      ownerId: owner1.id,
    },
    {
      key: 'S-CLOSED',
      title: 'Past Semester Survey',
      description: 'Previous term feedback (closed)',
      status: 'closed',
      publishedAt: new Date(Date.now() - 86400000 * 30),
      ownerId: owner1.id,
    },
    {
      key: 'S-OWNER2-DRAFT',
      title: 'Owner Two Private Survey',
      description: 'Private survey belonging to Owner Two',
      status: 'draft',
      publishedAt: null,
      ownerId: owner2.id,
    },
  ];

  for (const s of demoSurveys) {
    // Check if survey already exists by title and owner
    let survey = await client.survey.findFirst({
      where: { ownerId: s.ownerId, title: s.title },
    });

    if (!survey) {
      survey = await client.survey.create({
        data: {
          ownerId: s.ownerId,
          title: s.title,
          description: s.description,
          status: s.status,
          mode: 'identified',
          publishedAt: s.publishedAt,
          questions: {
            create: [
              {
                position: 1,
                text: 'Which aspect did you find most valuable?',
                type: 'single_choice',
                options: {
                  create: [
                    { position: 1, label: 'Lectures and Materials' },
                    { position: 2, label: 'Hands-on Labs' },
                    { position: 3, label: 'Team Collaboration' },
                  ],
                },
              },
              {
                position: 2,
                text: 'How satisfied are you with the course pace? (1=Lowest, 5=Highest)',
                type: 'rating',
              },
            ],
          },
        },
      });
    }
  }

  return demoSurveys.length;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  const { prisma } = await import('./prisma.js');
  try {
    const userCount = await seedUsers(prisma);
    const surveyCount = await seedSurveys(prisma);
    console.log(`seed: ${userCount} users, ${surveyCount} demo surveys upserted`);
  } finally {
    await prisma.$disconnect();
  }
}
