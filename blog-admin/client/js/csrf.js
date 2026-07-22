// Shared by every page (auth pages + admin.js): reads the readable csrfToken
// cookie set by the server and echoes it back on state-changing requests, per
// the double-submit-cookie pattern implemented in server/middleware/csrf.js.
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function withCsrfHeaders(headers = {}) {
  return { ...headers, 'x-csrf-token': getCsrfToken() };
}
