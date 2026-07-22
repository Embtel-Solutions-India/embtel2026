const xss = require('xss');

// Recursively runs string values through the xss filter (its default
// whitelist keeps common formatting tags but strips <script>, event
// handlers, javascript: URLs, etc.) — cheap defense-in-depth against
// stored/reflected XSS from rich text and public comment submissions.
function deepSanitize(value) {
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) return value.map(deepSanitize);
  if (value && typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      value[key] = deepSanitize(value[key]);
    });
    return value;
  }
  return value;
}

module.exports = function sanitizeInput(req, res, next) {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) deepSanitize(req.query);
  if (req.params) deepSanitize(req.params);
  next();
};
