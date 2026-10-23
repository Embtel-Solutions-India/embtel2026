// Only the production deployment may be indexed. Previews and local runs are always noindex.
export function isIndexable(): boolean {
  return process.env.VERCEL_ENV === 'production';
}
