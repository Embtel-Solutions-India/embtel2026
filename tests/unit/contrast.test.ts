import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/lib/design/contrast';
import { TOKENS } from '@/lib/design/tokens';

describe('contrastRatio', () => {
  it('is 21 for white on black', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });

  it('is 1 for identical colours', () => {
    expect(contrastRatio('#1A6BFF', '#1A6BFF')).toBeCloseTo(1, 5);
  });
});

describe('TOKENS', () => {
  it('keeps the legacy brand blue', () => {
    expect(TOKENS.blue).toBe('#1A6BFF');
  });

  it('muted text m1 passes WCAG AA on ink', () => {
    expect(contrastRatio(TOKENS.m1, TOKENS.ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text m2 passes WCAG AA on ink', () => {
    expect(contrastRatio(TOKENS.m2, TOKENS.ink)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('TOKENS on cards', () => {
  it('muted text m1 passes WCAG AA on s1 card surface', () => {
    expect(contrastRatio(TOKENS.m1, TOKENS.s1)).toBeGreaterThanOrEqual(4.5);
  });
});
