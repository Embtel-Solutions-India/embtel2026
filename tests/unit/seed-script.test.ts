import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// content:seed writes to whatever MONGODB_URI points at, so it must confirm the database like the other cutover tools.
describe('content:seed script', () => {
  it('refuses to run without an interactive terminal to confirm the database name', () => {
    const r = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/seed-content.ts'], {
      encoding: 'utf8',
      input: '',
      env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:1/never-used', VERCEL_ENV: '' },
      timeout: 60_000,
    });
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/interactive terminal/i);
  });
});
