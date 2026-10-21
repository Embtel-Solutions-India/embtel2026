import { createInterface } from 'node:readline';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { assertCutoverConfirmed } from '@/lib/db/migrations/cutover-guard';
import { MIGRATION_001, runMigration001 } from '@/lib/db/migrations/001-roles-and-authors';

const migrations: { name: string; run: (db: mongoose.Connection) => Promise<Record<string, number>> }[] = [
  { name: MIGRATION_001, run: runMigration001 },
];

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on('SIGINT', () => {
  process.stdout.write('\n');
  process.exit(130);
});
const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

async function main() {
  const args = process.argv.slice(2);
  // Fail fast, before touching the database.
  if (!args.includes('--cutover')) assertCutoverConfirmed(args, '', '');
  if (!process.stdin.isTTY) throw new Error('Refusing to migrate: an interactive terminal is required.');

  await connectDB();
  const db = mongoose.connection;

  // Counts only, never emails or other PII.
  const byRole = await db
    .collection('users')
    .aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    .toArray();
  console.log(`Database: ${db.name}\nUsers by role:`);
  for (const r of byRole) console.log(`  ${String(r._id)}: ${r.n}`);
  console.log('Any role other than admin/editor/marketing must be resolved by hand first.');

  assertCutoverConfirmed(args, await ask('Type the database name to confirm: '), db.name);
  rl.close();

  const applied = db.collection('migrations');
  for (const m of migrations) {
    if (await applied.findOne({ name: m.name })) {
      console.log(`skip ${m.name} (already applied)`);
      continue;
    }
    const counts = await m.run(db);
    await applied.insertOne({ name: m.name, appliedAt: new Date() });
    console.log(`applied ${m.name}`, counts);
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e instanceof Error ? e.message : 'unknown error');
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    return mongoose.disconnect();
  });
