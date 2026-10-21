// One-time conversion of the legacy embtel-final pages into reviewable JSON page documents.
// Usage: npm run content:import [-- --templated]   (writes content/pages/<slug>.json)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PageSchema, type Page } from '../../src/lib/content/blocks';
import { parseLegacyPage, TEMPLATED_SLUGS } from './templates';

const SRC = 'embtel-final';
const OUT = join('content', 'pages');

type Parser = (html: string, slug: string) => Page;
const jobs: { slug: string; file: string; parse: Parser }[] = TEMPLATED_SLUGS.map((slug) => ({ slug, file: `${slug}.html`, parse: parseLegacyPage }));

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
  if (failed) {
    console.error(`${failed} page(s) failed validation`);
    process.exitCode = 1;
  }
}

main();
