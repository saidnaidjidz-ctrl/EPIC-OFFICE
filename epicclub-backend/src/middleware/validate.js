const { validationResult } = require('express-validator');

/**
 * Middleware that inspects results from express-validator schema verification.
 * If errors are detected, it aborts request propagation and returns 400.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = validate;
