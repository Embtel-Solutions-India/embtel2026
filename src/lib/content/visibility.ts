// A post is public only when published, already due, and not soft-deleted. Shared by the cached
// loaders and the proxy's path index (which must not import 'use cache' modules).
export const PUBLIC_FILTER = (now = new Date()) => ({ status: 'published', publishedAt: { $lte: now }, isDeleted: { $ne: true } });
