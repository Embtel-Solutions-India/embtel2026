import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export async function startMemoryMongo(): Promise<{ uri: string; stop(): Promise<void> }> {
  const server = await MongoMemoryServer.create();
  return {
    uri: server.getUri(),
    stop: async () => {
      await mongoose.disconnect();
      (globalThis as { __mongoose?: unknown }).__mongoose = undefined; // drop stale cached connect promise
      await server.stop();
    },
  };
}
