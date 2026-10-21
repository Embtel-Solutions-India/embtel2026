import { MongoMemoryServer } from 'mongodb-memory-server';

export async function startMemoryMongo(): Promise<{ uri: string; stop(): Promise<void> }> {
  const server = await MongoMemoryServer.create();
  return { uri: server.getUri(), stop: async () => void (await server.stop()) };
}
