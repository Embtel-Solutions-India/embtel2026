import { connectDB } from '@/lib/db/connect';
import { Blog } from '@/lib/db/models/Blog';
import { Comment } from '@/lib/db/models/Comment';

const PER_PAGE = 30;
export const COMMENT_STATUSES = ['pending', 'approved', 'rejected', 'spam'] as const;
type Status = (typeof COMMENT_STATUSES)[number];
type Raw = Record<string, unknown>;

export type CommentRow = { id: string; post: string; name: string; content: string; status: string; createdAt: string };

// Legacy comments, read-only. Email and IP are deliberately not selected (personal data, not needed).
export async function listComments(opts: { status?: Status; page?: number }): Promise<{ items: CommentRow[]; page: number; pages: number }> {
  await connectDB();
  void Blog; // registers the model for populate
  const filter = opts.status ? { status: opts.status } : {};
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const [total, docs] = await Promise.all([
    Comment.countDocuments(filter),
    Comment.find(filter, { blog: 1, name: 1, content: 1, status: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .populate({ path: 'blog', select: 'title', options: { includeDeleted: true } })
      .lean<Raw[]>(),
  ]);
  return {
    page,
    pages: Math.ceil(total / PER_PAGE),
    items: docs.map((d) => ({
      id: String(d._id),
      post: String((d.blog as Raw | null)?.title ?? '(deleted post)'),
      name: String(d.name),
      content: String(d.content),
      status: String(d.status),
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : '',
    })),
  };
}
