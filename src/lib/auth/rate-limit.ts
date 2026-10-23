import { RateLimit } from '@/lib/db/models/RateLimit';

// Caller must have run connectDB(). Fixed window per key: one atomic pipeline upsert, where an
// expired (or missing) window restarts at 1. The TTL index only garbage-collects (it runs ~once a
// minute); correctness never relies on it.
let indexes: Promise<unknown> | undefined;

export async function hitRateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<{ allowed: boolean }> {
  // Unique `key` index must exist before the first upserts, or concurrent ones could duplicate.
  await (indexes ??= RateLimit.init().catch((e) => {
    indexes = undefined;
    throw e;
  }));
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

export async function resetRateLimit(key: string): Promise<void> {
  await RateLimit.deleteOne({ key });
}
