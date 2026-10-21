// Fail at server boot (naming the variable, never its value) if required env is missing or invalid.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { env } = await import('@/lib/env');
    void env.MONGODB_URI;
  }
}
