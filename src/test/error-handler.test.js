import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAPIResponse,
  createErrorResponse,
  createSuccessResponse,
  handleAPIError,
} from '../utils/error-handler.js';

describe('Error Handler Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('response creators', () => {
    it('should create API response objects', () => {
      const response = createAPIResponse(true, { id: 1 }, null);

      expect(response).toEqual({
        success: true,
        data: { id: 1 },
        error: null,
      });
    });

    it('should create error responses', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error, 'test-context');

      expect(response).toEqual({
        success: false,
        error: 'Test error',
        data: null,
      });
    });

    it('should create success responses', () => {
      const response = createSuccessResponse({ id: 1 }, 'Success message');

      expect(response).toEqual({
        success: true,
        data: { id: 1 },
        message: 'Success message',
        error: null,
      });
    });
  });

  describe('handleAPIError', () => {
    it('should handle HTTP error responses', () => {
      const error = {
        response: {
          status: 400,
          data: { error: 'Bad request' },
        },
      };

      expect(() => handleAPIError(error, 'test-context')).toThrow(
        'Bad request'
      );
    });

    it('should handle different HTTP status codes', () => {
      const createErrorWithStatus = status => ({
        response: { status, data: {} },
      });

      expect(() => handleAPIError(createErrorWithStatus(401), 'test')).toThrow(
        'Unauthorized - check API key'
      );
      expect(() => handleAPIError(createErrorWithStatus(404), 'test')).toThrow(
        'Resource not found'
      );
      expect(() => handleAPIError(createErrorWithStatus(429), 'test')).toThrow(
        'Rate limit exceeded'
      );
      expect(() => handleAPIError(createErrorWithStatus(500), 'test')).toThrow(
        'Server error'
      );
    });

    it('should handle connection errors', () => {
      const error = { code: 'ECONNREFUSED' };

      expect(() => handleAPIError(error, 'test-context')).toThrow(
        'Connection refused - server may be down'
      );
    });

    it('should handle timeout errors', () => {
      const error = { code: 'ETIMEDOUT' };

      expect(() => handleAPIError(error, 'test-context')).toThrow(
        'Request timeout - please try again'
      );
    });

    it('should re-throw unknown errors', () => {
      const error = new Error('Unknown error');

      expect(() => handleAPIError(error, 'test-context')).toThrow(
        'Unknown error'
      );
    });
  });
});
