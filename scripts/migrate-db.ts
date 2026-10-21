import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import { MIGRATION_001, runMigration001 } from '@/lib/db/migrations/001-roles-and-authors';

const migrations: { name: string; run: (db: mongoose.Connection) => Promise<Record<string, number>> }[] = [
  { name: MIGRATION_001, run: runMigration001 },
];

async function main() {
  await connectDB();
  const db = mongoose.connection;
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
  .finally(() => mongoose.disconnect());
