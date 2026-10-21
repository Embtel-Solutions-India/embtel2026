// One-time conversion of the legacy embtel-final pages into reviewable JSON page documents.
// Usage: npm run content:import   (writes content/pages/<slug>.json for all 30 non-blog pages)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PageSchema, type Page } from '../../src/lib/content/blocks';
import { parseLegacyPage, TEMPLATED_SLUGS } from './templates';
import { parseUniquePage, UNIQUE_PAGES } from './unique';
import { parseLegacyPosts } from './posts';

const SRC = 'embtel-final';
const OUT = join('content', 'pages');

type Parser = (html: string, slug: string) => Page;
const jobs: { slug: string; file: string; parse: Parser }[] = [
  ...TEMPLATED_SLUGS.map((slug) => ({ slug, file: `${slug}.html`, parse: parseLegacyPage })),
  ...UNIQUE_PAGES.map(({ slug, file }) => ({ slug, file, parse: parseUniquePage })),
];

function main() {
  mkdirSync(OUT, { recursive: true });
  let failed = 0;
  for (const job of jobs) {
    const page = job.parse(readFileSync(join(SRC, job.file), 'utf8'), job.slug);
    const result = PageSchema.safeParse(page);
    if (!result.success) {
      failed++;
      console.error(`✗ ${job.slug}: ${result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
      continue;
    }
    writeFileSync(join(OUT, `${job.slug}.json`), `${JSON.stringify(page, null, 2)}\n`);
    const counts = page.blocks.map((b) => b.type).join(', ');
    console.log(`✓ ${job.slug} (${page.blocks.length} blocks: ${counts})`);
  }
  // Blog: content/blog/{categories,tags}.json + content/blog/posts/<slug>.json
  const blog = parseLegacyPosts(readFileSync(join(SRC, 'includes', 'blog-posts.js'), 'utf8'));
  const blogDir = join('content', 'blog');
  mkdirSync(join(blogDir, 'posts'), { recursive: true });
  writeFileSync(join(blogDir, 'categories.json'), `${JSON.stringify(blog.categories, null, 2)}
`);
  writeFileSync(join(blogDir, 'tags.json'), `${JSON.stringify(blog.tags, null, 2)}
`);
  for (const p of blog.posts) writeFileSync(join(blogDir, 'posts', `${p.slug}.json`), `${JSON.stringify(p, null, 2)}
`);
  console.log(`✓ blog (${blog.posts.length} posts, ${blog.categories.length} categories, ${blog.tags.length} tags)`);

  if (failed) {
    console.error(`${failed} page(s) failed validation`);
    process.exitCode = 1;
  }
}

main();
