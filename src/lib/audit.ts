import { connectDB } from '@/lib/db/connect';
import { AuditLog } from '@/lib/db/models/AuditLog';

const SENSITIVE = /password|token|secret|key/i;

// `path` holds the ancestors being walked, so only true cycles (not shared refs) become '[Circular]'.
function scrub(v: unknown, path = new WeakSet<object>()): unknown {
  const isArr = Array.isArray(v);
  if (!isArr && !(v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype)) return v;
  if (path.has(v as object)) return '[Circular]';
  path.add(v as object);
  const out = isArr
    ? v.map((x) => scrub(x, path))
    : Object.fromEntries(
        Object.entries(v as object)
          .filter(([k]) => !SENSITIVE.test(k))
          .map(([k, x]) => [k, scrub(x, path)]),
      );
  path.delete(v as object);
  return out;
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
