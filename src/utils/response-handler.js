/*******************************************************************************
 * Standard API Response Handler
 * Ensures consistent API response format across all endpoints
 ******************************************************************************/

class ResponseHandler {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static error(res, message = 'Error', statusCode = 400, error = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    // Include error details only in development
    if (process.env.NODE_ENV === 'development' && error) {
      response.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    return res.status(statusCode).json(response);
  }

  static paginated(res, data, pagination, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
      },
      timestamp: new Date().toISOString(),
    });
  }

  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static badRequest(res, message = 'Bad Request') {
    return this.error(res, message, 400);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static notFound(res, message = 'Not Found') {
    return this.error(res, message, 404);
  }

  static conflict(res, message = 'Conflict') {
    return this.error(res, message, 409);
  }

  static internalError(res, message = 'Internal Server Error', error = null) {
    return this.error(res, message, 500, error);
  }
}

module.exports = ResponseHandler;