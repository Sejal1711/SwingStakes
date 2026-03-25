/**
 * Standard API response helpers.
 * Ensures consistent response shapes across all endpoints.
 */

/**
 * Success response.
 * @param {*} data - Payload to return
 * @param {string} message - Optional human-readable message
 * @param {object} meta - Optional metadata (pagination, etc.)
 */
function successResponse(data = null, message = 'Success', meta = null) {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
}

/**
 * Paginated success response.
 * @param {Array} data - Array of items
 * @param {number} total - Total item count
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 */
function paginatedResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return successResponse(data, 'Success', {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  });
}

/**
 * Error response.
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Optional detailed errors (e.g. field validation errors)
 */
function errorResponse(message = 'An error occurred', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message,
    statusCode,
  };

  if (errors) {
    response.errors = errors;
  }

  return response;
}

/**
 * Created response (201).
 */
function createdResponse(data, message = 'Resource created successfully') {
  return successResponse(data, message);
}

/**
 * No content response body helper (204 status typically has no body, but useful for 200 deletes).
 */
function deletedResponse(message = 'Resource deleted successfully') {
  return successResponse(null, message);
}

module.exports = {
  successResponse,
  paginatedResponse,
  errorResponse,
  createdResponse,
  deletedResponse,
};
