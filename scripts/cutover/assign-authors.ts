// Usage (cutover only, against the production copy first): npm run cutover:authors -- --cutover
// Credits imported posts (byline only) to real users so author pages and Person schema work.
import { createInterface } from 'node:readline';
import mongoose from 'mongoose';
import { assignAuthor, listAccounts, postsWithoutAuthor } from '../../src/lib/cutover/accounts';
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
  const users = (await listAccounts()).filter((u) => u.active);
  const posts = await postsWithoutAuthor();
  if (!posts.length) return console.log('Every post already has an author.');
  console.log('\nAuthors:');
  users.forEach((u, i) => console.log(`  ${i + 1}. ${u.name} (${u.role})`));
  console.log(`\n${posts.length} posts have only a byline name. For each, enter an author number, Enter to skip, or "a<number>" to give ALL remaining posts that author.`);
  let total = 0;
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const c = (await ask(`\n"${p.title}" (byline: ${p.authorName || '—'}) → `)).trim().toLowerCase();
    const all = c.startsWith('a');
    const user = users[Number(all ? c.slice(1) : c) - 1];
    if (!c || !user) continue;
    total += await assignAuthor(all ? posts.slice(i).map((x) => x.slug) : [p.slug], user.id);
    if (all) break;
  }
  console.log(`\nDone: ${total} posts credited.`);
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
