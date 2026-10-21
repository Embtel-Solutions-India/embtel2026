// E2E launcher (run by Playwright webServer via tsx): memory Mongo + seeded admin + `next build && next start`.
// Every secret is generated here at runtime; credentials go to a git-ignored file for the specs.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/lib/db/models/User';
import { CREDS_FILE, E2E_PORT } from './creds';

const rnd = (n: number) => crypto.randomBytes(n).toString('hex');
const nextBin = path.resolve('node_modules/next/dist/bin/next');

async function main() {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('embtel-e2e');
  await mongoose.connect(uri);
  const password = rnd(16);
  await User.create({ name: 'E2E Admin', email: 'admin@example.com', password, role: 'admin' });
  await mongoose.disconnect();

  fs.mkdirSync(path.dirname(CREDS_FILE), { recursive: true });
  fs.writeFileSync(CREDS_FILE, JSON.stringify({ email: 'admin@example.com', password }));

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    SITE_URL: `http://localhost:${E2E_PORT}`,
    MONGODB_URI: uri,
    SESSION_SECRET: rnd(32),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('base64'),
    AWS_S3_BUCKET: 'e2e-bucket',
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: rnd(10),
    AWS_SECRET_ACCESS_KEY: rnd(20),
  };
  const run = (args: string[]) =>
    new Promise<number>((resolve) => {
      const p = spawn(process.execPath, [nextBin, ...args], { env, stdio: 'inherit' });
      const stop = () => p.kill();
      process.once('SIGINT', stop).once('SIGTERM', stop);
      p.on('exit', (code) => resolve(code ?? 1));
    });

  let code = await run(['build']);
  if (code === 0) code = await run(['start', '-p', String(E2E_PORT)]);
  fs.rmSync(CREDS_FILE, { force: true });
  await mongo.stop();
  process.exit(code);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'e2e launcher failed');
  process.exit(1);
});
