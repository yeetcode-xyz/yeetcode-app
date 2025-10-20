const logError = (context, error) => {
  console.error(`[ERROR][${context}]`, error);
};

const logDebug = (context, message, data = null) => {
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    console.log(`[DEBUG][${context}]`, message, data || '');
  }
};

const handleAPIError = (error, context) => {
  logError(context, error);

  if (error.response) {
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

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    throw new Error(
      'Unable to connect to YeetCode servers. Please check your internet connection and try again.'
    );
  }

  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    throw new Error(
      'Request timed out. The server might be experiencing high load. Please try again.'
    );
  }

  // Check for AWS/database errors
  if (
    error.message &&
    (error.message.includes('DynamoDB') ||
      error.message.includes('AWS') ||
      error.message.includes('unavailable') ||
      error.message.includes('Service temporarily unavailable'))
  ) {
    throw new Error(
      'Our database service is temporarily unavailable. Please try again in a few moments.'
    );
  }

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
