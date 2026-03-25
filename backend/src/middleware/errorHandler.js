const { errorResponse } = require('../utils/response');

/**
 * Global error handling middleware.
 * Must be registered LAST in the Express middleware chain.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(422).json(errorResponse('Validation failed', 422, err.errors));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(errorResponse('Invalid token', 401));
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(errorResponse('Token has expired', 401));
  }

  // Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    return res.status(400).json(errorResponse(err.message, 400));
  }

  // Known HTTP errors
  if (err.status && err.status < 500) {
    return res.status(err.status).json(errorResponse(err.message, err.status));
  }

  // Generic server error
  const statusCode = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : err.message || 'Internal server error';

  return res.status(statusCode).json(errorResponse(message, statusCode));
}

module.exports = errorHandler;
