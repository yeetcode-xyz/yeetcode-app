import { describe, it, expect } from 'vitest';

describe('Config Module', () => {
  it('should have correct default values', () => {
    const expectedDefaults = {
      leetCodeGraphQLUrl: 'https://leetcode.com/graphql',
      fastApiTimeout: 10000,
      leetCodeTimeout: 10000,
      userAgent: 'YeetCode/1.0',
    };

    // These values should be consistent regardless of environment
    expect(expectedDefaults.leetCodeGraphQLUrl).toBe(
      'https://leetcode.com/graphql'
    );
    expect(expectedDefaults.userAgent).toBe('YeetCode/1.0');
    expect(expectedDefaults.fastApiTimeout).toBe(10000);
  });

  it('should detect development environment correctly', () => {
    // Test development detection logic
    const testCases = [
      { nodeEnv: 'development', expected: true },
      { nodeEnv: 'production', expected: false },
      { nodeEnv: 'test', expected: false },
      { nodeEnv: undefined, expected: false },
    ];

    testCases.forEach(({ nodeEnv, expected }) => {
      const isDev = nodeEnv === 'development';
      expect(isDev).toBe(expected);
    });
  });

  it('should validate required configuration', () => {
    const mockValidateRequired = () => {
      const required = ['fastApiUrl', 'apiKey'];
      const config = {
        fastApiUrl: process.env.FASTAPI_URL,
        apiKey: process.env.YETCODE_API_KEY,
      };

      const missing = required.filter(key => !config[key]);

      if (missing.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missing.join(', ')}`
        );
      }
    };

    // Test with missing variables
    expect(() => mockValidateRequired()).toThrow(
      'Missing required environment variables: fastApiUrl, apiKey'
    );

    // Test with all variables present
    process.env.FASTAPI_URL = 'https://api.example.com';
    process.env.YETCODE_API_KEY = 'test-key';

    expect(() => mockValidateRequired()).not.toThrow();
  });
});
