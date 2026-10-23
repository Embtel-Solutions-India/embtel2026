// `?page=` → 1..999, or null for anything else (proxy turns null into a real 404). Proxy-safe (no DB).
export function parsePage(raw: string | string[] | null | undefined): number | null {
  if (raw === undefined || raw === null) return 1;
  if (typeof raw !== 'string' || !/^[1-9]\d{0,2}$/.test(raw)) return null;
  return Number(raw);
}
