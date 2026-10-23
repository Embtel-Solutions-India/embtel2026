// Fail at server boot (naming the variable, never its value) if required env is missing or invalid.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // zod keeps this on globalThis, so it applies to every server bundle in the process.
    const [{ z }, { zodMessages }] = await Promise.all([import('zod'), import('@/lib/zod-messages')]);
    z.config({ customError: zodMessages });
    const { env } = await import('@/lib/env');
    void env.MONGODB_URI;
  }
}
