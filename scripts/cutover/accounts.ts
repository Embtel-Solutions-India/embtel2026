// Usage (cutover only, against the production copy first): npm run cutover:accounts -- --cutover
// Reviews every account: keep, deactivate (e.g. the legacy seeded admin) or print a one-time set-password link.
import { createInterface } from 'node:readline';
import mongoose from 'mongoose';
import { applyAccountDecision, listAccounts } from '../../src/lib/cutover/accounts';
import { connectDB } from '../../src/lib/db/connect';
import { assertCutoverConfirmed } from '../../src/lib/db/migrations/cutover-guard';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes('--cutover')) assertCutoverConfirmed(args, '', '');
  if (!process.stdin.isTTY) throw new Error('Refusing: an interactive terminal is required.');
  await connectDB();
  assertCutoverConfirmed(args, await ask(`Database: ${mongoose.connection.name}\nType the database name to confirm: `), mongoose.connection.name);
  const site = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
  const tally = { kept: 0, deactivated: 0, link: 0 };
  for (const a of await listAccounts()) {
    console.log(`\n${a.name} <${a.email}> · ${a.role} · ${a.active ? 'active' : 'inactive'} · last sign-in ${a.lastLoginAt}`);
    const c = (await ask('[k]eep, [d]eactivate, or send a set-password [l]ink? (k) ')).trim().toLowerCase();
    try {
      const r = await applyAccountDecision(a.id, c === 'd' ? 'deactivate' : c === 'l' ? 'link' : 'keep');
      tally[r.done]++;
      if (r.done === 'link') console.log(`  One-time link (72 h) — send it privately, it is not stored: ${site}${r.path}`);
    } catch (e) {
      console.log(`  Skipped: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }
  console.log(`\nDone: ${tally.kept} kept, ${tally.deactivated} deactivated, ${tally.link} links issued.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : 'failed');
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    return mongoose.disconnect();
  });
