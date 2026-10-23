import { connectDB } from '@/lib/db/connect';
import { AuditLog } from '@/lib/db/models/AuditLog';
import { User } from '@/lib/db/models/User';

const PER_PAGE = 50;
export const AUDIT_AREAS = ['auth', 'post', 'page', 'category', 'tag', 'media', 'user', 'profile', 'settings', 'lead', 'seo'] as const;
type Raw = Record<string, unknown>;

export type AuditRow = { id: string; at: string; actor: string; action: string; target: string; details: string };

const details = (meta: unknown) =>
  Object.entries((meta as Raw) ?? {})
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');

export async function listAudit(opts: { area?: string; page?: number }): Promise<{ items: AuditRow[]; page: number; pages: number }> {
  await connectDB();
  // Only known areas become a filter (anchored prefix); anything else is ignored.
  const area = (AUDIT_AREAS as readonly string[]).includes(opts.area ?? '') ? opts.area : undefined;
  const filter = area ? { action: { $regex: `^${area}\\.` } } : {};
  const page = Math.min(1000, Math.max(1, Math.floor(opts.page ?? 1) || 1));
  const [total, docs] = await Promise.all([AuditLog.countDocuments(filter), AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PER_PAGE).limit(PER_PAGE).lean<Raw[]>()]);
  const users = await User.find({ _id: { $in: [...new Set(docs.map((d) => String(d.actorId)))] } }, { name: 1 }).lean();
  const names = new Map(users.map((u) => [String(u._id), u.name]));
  return {
    page,
    pages: Math.ceil(total / PER_PAGE),
    items: docs.map((d) => {
      const t = (d.target as Raw) ?? {};
      return {
        id: String(d._id),
        at: d.createdAt instanceof Date ? d.createdAt.toISOString() : '',
        actor: names.get(String(d.actorId)) ?? 'Deleted user',
        action: String(d.action),
        target: [t.type, t.id].filter(Boolean).join(' '),
        details: details(d.meta),
      };
    }),
  };
}
