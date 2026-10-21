import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import mongoose from 'mongoose';
import { createAdmin } from '@/lib/auth/create-admin';
import { connectDB } from '@/lib/db/connect';

// Credentials come from the terminal only; the password prompt is not echoed.
let muted = false;
const out = new Writable({
  write(chunk, _enc, cb) {
    if (!muted) process.stdout.write(chunk);
    cb();
  },
});
const rl = createInterface({ input: process.stdin, output: out, terminal: true });
const ask = (q: string, hidden = false) =>
  new Promise<string>((resolve) => {
    process.stdout.write(q);
    muted = hidden;
    rl.question('', (a) => {
      muted = false;
      if (hidden) process.stdout.write('\n');
      resolve(a);
    });
  });

async function main() {
  const name = await ask('Name: ');
  const email = await ask('Email: ');
  const password = await ask('Password (min 12 chars): ', true);
  if (password !== (await ask('Confirm password: ', true))) throw new Error('Passwords do not match');
  rl.close();

  await connectDB();
  const { id } = await createAdmin({ name, email, password });
  console.log(`Admin created (id ${id})`);
}

main()
  .catch((e) => {
    console.error('Failed:', e instanceof Error ? e.message : 'unknown error');
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    return mongoose.disconnect();
  });
