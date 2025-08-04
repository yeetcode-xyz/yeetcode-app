// Centralized error handling utilities

const logError = (context, error) => {
  console.error(`[ERROR][${context}]`, error);
};

const logDebug = (context, message, data = null) => {
  console.log(`[DEBUG][${context}]`, message, data || '');
};

const handleAPIError = (error, context) => {
  logError(context, error);

  if (error.response) {
    // HTTP error response
    const status = error.response.status;
    const data = error.response.data;

    if (data && data.error) {
      throw new Error(data.error);
    }

    switch (status) {
      case 400:
        throw new Error('Bad request - invalid data provided');
      case 401:
        throw new Error('Unauthorized - check API key');
      case 403:
        throw new Error('Forbidden - access denied');
      case 404:
        throw new Error('Resource not found');
      case 429:
        throw new Error('Rate limit exceeded - please try again later');
      case 500:
        throw new Error('Server error - please try again later');
      default:
        throw new Error(`API error: ${status}`);
    }
  }

  if (error.code === 'ECONNREFUSED') {
    throw new Error('Connection refused - server may be down');
  }

  if (error.code === 'ETIMEDOUT') {
    throw new Error('Request timeout - please try again');
  }

  // Re-throw original error if we can't handle it
  throw error;
};

const createAPIResponse = (success, data = null, error = null) => {
  return {
    success,
    data,
    error,
  };
};

const handleGraphQLError = (error, context) => {
  logError(context, error);

  if (error.message.includes('That user does not exist')) {
    return {
      success: false,
      error: 'Username not found on LeetCode',
    };
  }

  if (error.message.includes('GraphQL query failed')) {
    return {
      success: false,
      error: 'LeetCode API error - please try again',
    };
  }

  throw error;
};

const wrapAsyncHandler = (handler, context) => {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleAPIError(error, context);
    }
  };
};

const validateResponse = (response, context) => {
  if (!response) {
    throw new Error(`No response received from ${context}`);
  }

  if (response.data && response.data.success === false) {
    throw new Error(response.data.error || `${context} request failed`);
  }

  return response;
};

const createErrorResponse = (error, context) => {
  logError(context, error);

  return {
    success: false,
    error: error.message || 'Unknown error occurred',
    data: null,
  };
};

const createSuccessResponse = (data, message = null) => {
  return {
    success: true,
    data,
    message,
    error: null,
  };
};

module.exports = {
  logError,
  logDebug,
  handleAPIError,
  createAPIResponse,
  handleGraphQLError,
  wrapAsyncHandler,
  validateResponse,
  createErrorResponse,
  createSuccessResponse,
};
