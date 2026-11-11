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

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  const { prisma } = await import('./prisma.js');
  try {
    const count = await seedUsers(prisma);
    console.log(`seed: ${count} users upserted`);
  } finally {
    await prisma.$disconnect();
  }
}
