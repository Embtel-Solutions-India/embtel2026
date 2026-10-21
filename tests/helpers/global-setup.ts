import { MongoMemoryServer } from 'mongodb-memory-server';

// One mongod for the whole run; workers inherit the env var. Each test file gets its own database.
export default async function setup() {
  const server = await MongoMemoryServer.create();
  process.env.MONGO_TEST_BASE_URI = server.getUri();
  return async () => {
    await server.stop();
  };
}
