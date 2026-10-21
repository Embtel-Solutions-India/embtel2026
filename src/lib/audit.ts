import { connectDB } from '@/lib/db/connect';
import { AuditLog } from '@/lib/db/models/AuditLog';

const SENSITIVE = /password|token|secret|key/i;

function scrub(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => !SENSITIVE.test(k))
        .map(([k, x]) => [k, scrub(x)]),
    );
  }
  return v;
}

export async function audit(entry: {
  actorId: string;
  action: string;
  target: { type: string; id?: string };
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({ ...entry, meta: scrub(entry.meta ?? {}) });
  } catch (err) {
    // Never break the caller's flow; log the message only (meta may be sensitive).
    console.error('[audit] write failed:', err instanceof Error ? err.message : 'unknown error');
  }
}
