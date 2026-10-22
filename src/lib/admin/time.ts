// Browser-side helpers for <input type="datetime-local">, which has no time zone.

const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');

// "2026-11-01T09:00" (browser local time) → "2026-11-01T09:00:00-05:00".
export function withOffset(local: string): string {
  const d = new Date(local);
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${local.slice(0, 16)}:00${sign}${pad(Math.trunc(off / 60))}:${pad(off % 60)}`;
}

// ISO instant → "2026-11-01T09:00" in the browser's local time.
export function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
