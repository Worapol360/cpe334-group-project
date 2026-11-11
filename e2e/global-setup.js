import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export default async function globalSetup() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const harnessPath = path.join(rootDir, 'server', 'tests', 'harness', 'db.js');

  const originalDatabaseUrl = process.env.DATABASE_URL;
  const harness = await import(pathToFileURL(harnessPath).href);
  await harness.resetAndSeed();
  await harness.closePrisma();
  process.env.DATABASE_URL = originalDatabaseUrl;
}
