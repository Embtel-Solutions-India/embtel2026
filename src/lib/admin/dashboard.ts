import { connectDB } from '@/lib/db/connect';
import { Blog } from '@/lib/db/models/Blog';

type Row = { _id: unknown; title: string; status?: string; scheduledAt?: Date; updatedAt?: Date };
const LIVE = { isDeleted: { $ne: true } };

export async function loadDashboard() {
  await connectDB();
  const [published, scheduled, draft, trashed, upcoming, recent] = await Promise.all([
    Blog.countDocuments({ ...LIVE, status: 'published' }),
    Blog.countDocuments({ ...LIVE, status: 'scheduled' }),
    Blog.countDocuments({ ...LIVE, status: 'draft' }),
    Blog.countDocuments({ isDeleted: true }),
    Blog.find({ status: 'scheduled' }, { title: 1, scheduledAt: 1 }).sort({ scheduledAt: 1 }).limit(5).lean<Row[]>(),
    Blog.find({}, { title: 1, status: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(5).lean<Row[]>(),
  ]);
  return {
    counts: { published, scheduled, draft, trashed },
    upcoming: upcoming.map((p) => ({ id: String(p._id), title: p.title, scheduledAt: p.scheduledAt?.toISOString() ?? '' })),
    recent: recent.map((p) => ({ id: String(p._id), title: p.title, status: p.status ?? 'draft', updatedAt: p.updatedAt?.toISOString() ?? '' })),
  };
}
