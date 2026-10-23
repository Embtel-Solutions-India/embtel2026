import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodMessages } from '@/lib/zod-messages';

const first = (schema: z.ZodType, input: unknown) => {
  const r = schema.safeParse(input);
  return r.success ? null : r.error.issues[0].message;
};

describe('zod messages', () => {
  beforeAll(() => z.config({ customError: zodMessages }));
  afterAll(() => z.config({ customError: undefined }));

  it('turns built-in checks into plain English', () => {
    const name = z.object({ name: z.string().min(1).max(80) });
    expect(first(name, {})).toBe('Required');
    expect(first(name, { name: '' })).toBe('Required');
    expect(first(name, { name: 'x'.repeat(81) })).toBe('Must be at most 80 characters');
    expect(first(z.string().min(8), 'short')).toBe('Must be at least 8 characters');
    expect(first(z.array(z.string()).max(2), ['a', 'b', 'c'])).toBe('No more than 2 allowed');
    expect(first(z.string().email(), 'nope')).toBe('Enter a valid email address');
    expect(first(z.string().url(), 'nope')).toBe('Enter a valid URL');
  });

  it('keeps messages a schema sets itself', () => {
    expect(first(z.string().min(1, 'Tell us a little about your project'), '')).toBe('Tell us a little about your project');
    expect(first(z.literal(true, { error: 'Please agree' }), false)).toBe('Please agree');
  });
});
