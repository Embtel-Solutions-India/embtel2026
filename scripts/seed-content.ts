// Seeds content/settings.json and content/blog/ into the database (site pages ship in the build).
// Idempotent: existing posts and filled settings fields are never overwritten. Prints counts only.
// Usage: npm run content:seed [-- --yes]   (--yes required against production)
// Always shows the target database name and asks the operator to type it (an interactive terminal is required).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import mongoose from 'mongoose';
import type { SeedBlog } from '../src/lib/content/blog-seed';
import { seedContent } from '../src/lib/content/seed';
import { connectDB } from '../src/lib/db/connect';
import { SiteSettingsSchema, type SiteSettings } from '../src/lib/content/settings';

export function readContent(dir = 'content'): { settings: SiteSettings; blog: SeedBlog } {
  const settings = SiteSettingsSchema.parse(JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8')));
  const json = (f: string) => JSON.parse(readFileSync(join(dir, 'blog', f), 'utf8'));
  const postsDir = join(dir, 'blog', 'posts');
  const blog: SeedBlog = {
    categories: json('categories.json'),
    tags: json('tags.json'),
    posts: readdirSync(postsDir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(postsDir, f), 'utf8'))),
  };
  return { settings, blog };
}

async function main() {
  const args = process.argv.slice(2);
  if (process.env.VERCEL_ENV === 'production' && !args.includes('--yes')) {
    console.error('Refusing to seed production without --yes.');
    process.exitCode = 1;
    return;
  }
  if (!process.stdin.isTTY) throw new Error('Refusing to seed: an interactive terminal is required to confirm the database.');
  await connectDB();
  const name = mongoose.connection.name;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const typed = await new Promise<string>((resolve) => rl.question(`Database: ${name}
Type the database name to confirm: `, resolve));
  rl.close();
  if (!name || typed.trim() !== name) throw new Error('Refusing to seed: typed database name does not match.');
  const r = await seedContent(readContent());
  console.log(`settings fields filled: ${r.settingsFieldsFilled.length}`);
  console.log(`posts inserted: ${r.postsInserted.length}, skipped (already present): ${r.postsSkipped.length}`);
  console.log('Restart or redeploy the app (or save in the admin) to refresh cached content.');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/seed-content.ts')) {
  main()
    .catch((e) => {
      console.error(e instanceof Error ? e.message : 'seed failed');
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
