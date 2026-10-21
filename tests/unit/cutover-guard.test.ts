import { describe, expect, it } from 'vitest';
import { assertCutoverConfirmed } from '@/lib/db/migrations/cutover-guard';

describe('assertCutoverConfirmed', () => {
  it('passes with --cutover and the exact db name', () => {
    expect(() => assertCutoverConfirmed(['--cutover'], 'prod', 'prod')).not.toThrow();
  });
  it('refuses without --cutover', () => {
    expect(() => assertCutoverConfirmed([], 'prod', 'prod')).toThrow(/--cutover/);
  });
  it('refuses a wrong or empty typed name', () => {
    expect(() => assertCutoverConfirmed(['--cutover'], 'prd', 'prod')).toThrow(/does not match/);
    expect(() => assertCutoverConfirmed(['--cutover'], '', '')).toThrow();
  });
});
