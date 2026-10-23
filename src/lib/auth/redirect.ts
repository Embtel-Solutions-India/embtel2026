// Only same-site `/admin/` paths: no backslashes (so no `/\`), whitespace or control chars, and no
// `..` segments (literal or %2e-encoded) that would climb out of /admin/.
const SAFE = /^\/admin\/[^\\\s\x00-\x1f]*$/;
const DOT_DOT = /(^|\/)(\.|%2e){2}(\/|\?|#|$)/i;

export function safeRedirect(target: string | null | undefined, fallback = '/admin/dashboard'): string {
  return target && SAFE.test(target) && !DOT_DOT.test(target) ? target : fallback;
}
