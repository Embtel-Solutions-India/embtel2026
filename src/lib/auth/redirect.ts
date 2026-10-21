// Only same-site admin paths; no protocol-relative (`//`, `/\`), backslashes, whitespace or control chars.
const SAFE = /^\/admin\/[^\\\s\x00-\x1f]*$/;

export function safeRedirect(target: string | null | undefined, fallback = '/admin/dashboard'): string {
  return target && SAFE.test(target) ? target : fallback;
}
