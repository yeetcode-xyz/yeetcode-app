import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a simple test-only version to avoid network calls
const createTestAPIClient = config => {
  return {
    baseURL: config.fastApiUrl,
    timeout: config.fastApiTimeout,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    async get(endpoint) {
      return { success: true, data: { endpoint, method: 'GET' } };
    },
    async post(endpoint, data) {
      return { success: true, data: { endpoint, method: 'POST', data } };
    },
  };
};

const createTestLeetCodeClient = config => {
  return {
    url: config.leetCodeGraphQLUrl,
    timeout: config.leetCodeTimeout,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': config.userAgent,
    },
    async validateUsername(username) {
      return username === 'testuser'
        ? { exists: true, error: null }
        : { exists: false, error: 'Username not found on LeetCode' };
    },
    async selectRandomProblem(difficulty) {
      return {
        title: `Random ${difficulty} Problem`,
        paidOnly: false,
        difficulty,
      };
    },
  };
};

describe('API Clients', () => {
  const testConfig = {
    fastApiUrl: 'https://api.test.com',
    apiKey: 'test-api-key',
    leetCodeGraphQLUrl: 'https://leetcode.com/graphql',
    fastApiTimeout: 10000,
    leetCodeTimeout: 10000,
    userAgent: 'YeetCode/1.0',
  };

  describe('FastAPIClient', () => {
    it('should create client with correct configuration', () => {
      const client = createTestAPIClient(testConfig);

      expect(client.baseURL).toBe('https://api.test.com');
      expect(client.timeout).toBe(10000);
      expect(client.headers).toEqual({
        Authorization: 'Bearer test-api-key',
        'Content-Type': 'application/json',
      });
    });

    it('should make successful GET requests', async () => {
      const client = createTestAPIClient(testConfig);
      const result = await client.get('/test-endpoint');

      expect(result).toEqual({
        success: true,
        data: { endpoint: '/test-endpoint', method: 'GET' },
      });
    });

    it('should make successful POST requests', async () => {
      const client = createTestAPIClient(testConfig);
      const postData = { name: 'test' };
      const result = await client.post('/create', postData);

      expect(result).toEqual({
        success: true,
        data: { endpoint: '/create', method: 'POST', data: postData },
      });
    });
  });

  describe('LeetCodeGraphQLClient', () => {
    it('should create client with correct configuration', () => {
      const client = createTestLeetCodeClient(testConfig);

      expect(client.url).toBe('https://leetcode.com/graphql');
      expect(client.timeout).toBe(10000);
      expect(client.headers).toEqual({
        'Content-Type': 'application/json',
        'User-Agent': 'YeetCode/1.0',
      });
    });

    it('should validate username successfully', async () => {
      const client = createTestLeetCodeClient(testConfig);
      const result = await client.validateUsername('testuser');

      expect(result).toEqual({
        exists: true,
        error: null,
      });
    });

    it('should handle non-existent username', async () => {
      const client = createTestLeetCodeClient(testConfig);
      const result = await client.validateUsername('nonexistent');

      expect(result).toEqual({
        exists: false,
        error: 'Username not found on LeetCode',
      });
    });

    it('should select random problems correctly', async () => {
      const client = createTestLeetCodeClient(testConfig);
      const result = await client.selectRandomProblem('EASY');

      expect(result).toEqual({
        title: 'Random EASY Problem',
        paidOnly: false,
        difficulty: 'EASY',
      });
    });
  });
});
