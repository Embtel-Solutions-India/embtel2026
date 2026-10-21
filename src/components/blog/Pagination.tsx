import Link from 'next/link';

// Prev / numbered / next links; extra query params (e.g. q) are preserved.
export function Pagination({ basePath, page, pages, query = {} }: { basePath: string; page: number; pages: number; query?: Record<string, string> }) {
  if (pages <= 1) return null;
  const href = (n: number) => {
    const qs = new URLSearchParams({ ...query, ...(n > 1 && { page: String(n) }) }).toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav className="blog-pager" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev">
          ← Newer
        </Link>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
        n === page ? (
          <span key={n} aria-current="page">
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)}>
            {n}
          </Link>
        ),
      )}
      {page < pages && (
        <Link href={href(page + 1)} rel="next">
          Older →
        </Link>
      )}
    </nav>
  );
}
