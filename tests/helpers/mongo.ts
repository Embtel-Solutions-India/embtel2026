import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

// The shared server is started once in tests/helpers/global-setup.ts; each call gets a fresh database.
export async function startMemoryMongo(): Promise<{ uri: string; stop(): Promise<void> }> {
  const base = process.env.MONGO_TEST_BASE_URI;
  if (!base) throw new Error('MONGO_TEST_BASE_URI missing: vitest globalSetup did not run');
  const uri = `${base.replace(/\/?$/, '/')}test_${randomUUID().replace(/-/g, '')}`;
  return {
    uri,
    stop: async () => {
      await mongoose.connection.dropDatabase().catch(() => {});
      await mongoose.disconnect();
      (globalThis as { __mongoose?: unknown }).__mongoose = undefined; // drop stale cached connect promise
    },
  };
}
