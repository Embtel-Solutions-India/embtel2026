import { RateLimit } from '@/lib/db/models/RateLimit';

// Caller must have run connectDB(). Fixed window per key. One atomic pipeline upsert: an expired (or missing) window restarts at 1.
// The TTL index only garbage-collects; correctness never relies on it (TTL runs ~once a minute).
export async function hitRateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<{ allowed: boolean }> {
  const now = new Date();
  const live = { $gt: ['$expiresAt', now] };
  const doc = await RateLimit.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          count: { $cond: [live, { $add: ['$count', 1] }, 1] },
          expiresAt: { $cond: [live, '$expiresAt', new Date(now.getTime() + windowSec * 1000)] },
        },
      },
    ],
    { upsert: true, new: true, lean: true },
  );
  return { allowed: (doc?.count ?? 1) <= max };
}
