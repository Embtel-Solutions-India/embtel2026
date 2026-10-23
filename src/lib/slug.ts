/** Lowercase ASCII slug: accents folded, symbols stripped, words joined by `-`. May return ''. */
export function toSlug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** toSlug(text) falling back to `user`, with -2, -3… appended until not in `taken`. Adds the result to `taken`. */
export function uniqueSlug(text: string, taken: Set<string>): string {
  const base = toSlug(text) || 'user';
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}
