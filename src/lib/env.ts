import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SITE_URL: z
    .string()
    .url()
    .transform((u) => u.replace(/\/+$/, '')),
  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z
    .string()
    .refine((k) => /^[A-Za-z0-9+/]+={0,2}$/.test(k) && Buffer.from(k, 'base64').length === 32),
  AWS_S3_BUCKET: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_PUBLIC_URL_BASE: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

// Throws with variable names only; values never appear in the message.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const r = schema.safeParse(source);
  if (!r.success) {
    throw new Error(
      'Invalid environment: ' + r.error.issues.map((i) => i.path.join('.')).join(', '),
    );
  }
  return r.data;
}

let cached: Env | undefined;

// Lazy: process.env is parsed on first property access, so importing never throws.
export const env: Env = new Proxy({} as Env, {
  get(_t, prop) {
    cached ??= parseEnv(process.env);
    return cached[prop as keyof Env];
  },
});
