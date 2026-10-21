import { describe, expect, it } from 'vitest';
import { parsePage } from '@/lib/content/pagination';

describe('parsePage', () => {
  it.each([
    [undefined, 1],
    ['1', 1],
    ['2', 2],
    ['999', 999],
  ])('%s → %s', (raw, want) => expect(parsePage(raw)).toBe(want));

  it.each([['0'], ['-1'], ['2.5'], ['abc'], [''], ['1000'], ['01'], [['1', '2']]])('%j → null', (raw) => {
    expect(parsePage(raw as string | string[])).toBeNull();
  });
});
