import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenv.config({ path: path.join(serverRoot, '.env') });

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error(
    'DATABASE_URL_TEST is not set. Refusing to run tests without a dedicated test database ' +
      '(see docs/system-sds.md §4.1 and §9).',
  );
}
if (testUrl === process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL_TEST equals DATABASE_URL. Refusing to run tests against the application database.',
  );
}

process.env.DATABASE_URL = testUrl;

const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
if (!existsSync(prismaCli)) {
  throw new Error('Prisma CLI is not installed. Run "npm install" inside server/ first.');
}

execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  cwd: serverRoot,
  env: { ...process.env, DATABASE_URL: testUrl },
  stdio: ['ignore', 'inherit', 'inherit'],
});

const { prisma } = await import('../../src/persistence/prisma.js');
const { seedUsers, seedSurveys } = await import('../../src/persistence/seed.js');

export async function resetAndSeed() {
  await prisma.answer.deleteMany();
  await prisma.response.deleteMany();
  await prisma.session.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.user.deleteMany();
  await seedUsers(prisma);
  await seedSurveys(prisma);
  return prisma.user.findMany({ orderBy: { id: 'asc' } });
}

export async function closePrisma() {
  await prisma.$disconnect();
}

export { prisma, seedUsers, seedSurveys };
