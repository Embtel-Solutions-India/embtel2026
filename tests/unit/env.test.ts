import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

const rnd = (n: number) => randomBytes(n).toString('hex');
const valid = (): Record<string, string> => ({
  NODE_ENV: 'test',
  SITE_URL: 'https://example.com/',
  MONGODB_URI: `mongodb://${rnd(6)}-host/x`,
  SESSION_SECRET: rnd(32),
  ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  AWS_S3_BUCKET: 'bucket',
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: rnd(8),
  AWS_SECRET_ACCESS_KEY: rnd(16),
});

describe('parseEnv', () => {
  it('throws naming every missing required var, without values', () => {
    const host = `${rnd(6)}-host`;
    const src = { MONGODB_URI: `mongodb://${host}/x` };
    expect(() => parseEnv(src)).toThrowError(/SESSION_SECRET[\s\S]*ENCRYPTION_KEY/);
    try {
      parseEnv(src);
    } catch (e) {
      expect(String(e)).not.toContain(host);
    }
  });

  it('rejects SESSION_SECRET shorter than 32 chars', () => {
    const s = rnd(8);
    expect(() => parseEnv({ ...valid(), SESSION_SECRET: s })).toThrowError(/SESSION_SECRET/);
  });

  it('rejects ENCRYPTION_KEY that is not 32 bytes base64', () => {
    const k = randomBytes(16).toString('base64');
    let msg = '';
    try {
      parseEnv({ ...valid(), ENCRYPTION_KEY: k });
    } catch (e) {
      msg = String(e);
    }
    expect(msg).toMatch(/ENCRYPTION_KEY/);
    expect(msg).not.toContain(k);
  });

  it('defaults SMTP_PORT to 587 and strips SITE_URL trailing slash', () => {
    const e = parseEnv(valid());
    expect(e.SMTP_PORT).toBe(587);
    expect(e.SITE_URL).toBe('https://example.com');
    expect(e.SMTP_HOST).toBeUndefined();
  });
});
