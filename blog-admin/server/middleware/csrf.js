const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const COOKIE_NAME = 'csrfToken';
const HEADER_NAME = 'x-csrf-token';

// Double-submit-cookie CSRF protection: issue a random token in a readable
// cookie, require the client to echo it back via header/body on state-changing
// requests, and reject if the two don't match (a cross-site form post can't
// read the cookie to forge the echo).
function issueCsrfToken(req, res, next) {
  if (!req.cookies?.[COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: req.secure,
    });
    req.cookies[COOKIE_NAME] = token;
  }
  res.locals.csrfToken = req.cookies[COOKIE_NAME];
  next();
}

function verifyCsrfToken(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const cookieToken = req.cookies?.[COOKIE_NAME];
  const suppliedToken = req.headers[HEADER_NAME] || req.body?._csrf;

  if (!cookieToken || !suppliedToken || cookieToken !== suppliedToken) {
    return next(new ApiError(403, 'Invalid or missing CSRF token.'));
  }
  next();
}

module.exports = { issueCsrfToken, verifyCsrfToken, COOKIE_NAME, HEADER_NAME };
