const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs after an array of express-validator checks; collects and forwards
// any failures as a single 400 ApiError so callers get one consistent shape.
module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => `${e.path}: ${e.msg}`);

  if (req.originalUrl.startsWith('/api/')) {
    return next(new ApiError(400, 'Validation failed', errors));
  }

  req.flashError = errors.join(', ');
  return next(new ApiError(400, req.flashError, errors));
};
