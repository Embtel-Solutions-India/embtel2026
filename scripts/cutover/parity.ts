// Usage: npm run cutover:parity -- <baseUrl> [--inventory search-console-pages.csv] [--expect-indexable]
// Read-only GETs against <baseUrl>. Exit code 1 if any URL fails. Never point it at production without the owner's go.
import { readdirSync, readFileSync } from 'node:fs';
import { checkUrl, inventoryFrom, pathsFromSearchConsoleCsv } from '../../src/lib/cutover/parity';

async function main() {
  const args = process.argv.slice(2);
  const base = args.find((a) => /^https?:\/\//.test(a));
  if (!base) throw new Error('Usage: cutover:parity <baseUrl> [--inventory pages.csv] [--expect-indexable]');
  const legacyPages = readdirSync('embtel-final').filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''));
  const postSlugs = readdirSync('content/blog/posts').map((f) => f.replace(/\.json$/, ''));
  const legacyImages = readdirSync('embtel-final/images');
  const paths = new Set(inventoryFrom({ legacyPages, postSlugs, legacyImages }));
  const inv = args[args.indexOf('--inventory') + 1];
  if (args.includes('--inventory') && inv) for (const p of pathsFromSearchConsoleCsv(readFileSync(inv, 'utf8'), 'www.embtelsolutions.com')) paths.add(p);

  const results = [];
  for (const p of paths) results.push(await checkUrl(base, p, fetch, { expectIndexable: args.includes('--expect-indexable') }));
  for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${String(r.status).padEnd(3)} ${r.path}${r.hops ? ` → ${r.finalPath}` : ''}${r.problem ? `  [${r.problem}]` : ''}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} URLs OK`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'parity check failed');
  process.exit(1);
});
