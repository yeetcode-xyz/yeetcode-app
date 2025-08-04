import { describe, it, expect } from 'vitest';
import {
  PROBLEM_LIST_QUERY,
  USER_PROFILE_QUERY,
  RECENT_SUBMISSIONS_QUERY,
  QUESTION_DETAIL_QUERY,
  PROBLEM_LIST_VARIABLES,
  DIFFICULTY_MAP,
} from '../utils/leetcode-queries.js';

describe('LeetCode Queries', () => {
  describe('GraphQL query constants', () => {
    it('should have valid GraphQL query strings', () => {
      expect(PROBLEM_LIST_QUERY).toContain('query problemsetQuestionList');
      expect(PROBLEM_LIST_QUERY).toContain(
        'problemsetQuestionList: questionList'
      );
      expect(PROBLEM_LIST_QUERY).toContain('questions: data');

      expect(USER_PROFILE_QUERY).toContain('query getUserProfile');
      expect(USER_PROFILE_QUERY).toContain('matchedUser(username: $username)');

      expect(RECENT_SUBMISSIONS_QUERY).toContain('query recentAcSubmissions');
      expect(RECENT_SUBMISSIONS_QUERY).toContain('recentAcSubmissionList');

      expect(QUESTION_DETAIL_QUERY).toContain('query getQuestionDetail');
      expect(QUESTION_DETAIL_QUERY).toContain(
        'question(titleSlug: $titleSlug)'
      );
    });

    it('should include all required fields in queries', () => {
      // Problem list query should include essential fields
      expect(PROBLEM_LIST_QUERY).toContain('title');
      expect(PROBLEM_LIST_QUERY).toContain('titleSlug');
      expect(PROBLEM_LIST_QUERY).toContain('difficulty');
      expect(PROBLEM_LIST_QUERY).toContain('paidOnly');
      expect(PROBLEM_LIST_QUERY).toContain('topicTags');

      // Question detail query should include content fields
      expect(QUESTION_DETAIL_QUERY).toContain('content');
      expect(QUESTION_DETAIL_QUERY).toContain('hints');
      expect(QUESTION_DETAIL_QUERY).toContain('sampleTestCase');

      // Submissions query should include timing info
      expect(RECENT_SUBMISSIONS_QUERY).toContain('timestamp');
    });
  });

  describe('variable templates', () => {
    it('should have correct default values', () => {
      expect(PROBLEM_LIST_VARIABLES).toEqual({
        categorySlug: '',
        limit: 1000,
        skip: 0,
        filters: {
          difficulty: 'MEDIUM',
        },
      });
    });

    it('should be modifiable for different use cases', () => {
      const customVariables = {
        ...PROBLEM_LIST_VARIABLES,
        limit: 50,
        filters: {
          difficulty: 'EASY',
        },
      };

      expect(customVariables.limit).toBe(50);
      expect(customVariables.filters.difficulty).toBe('EASY');
      // Original should be unchanged
      expect(PROBLEM_LIST_VARIABLES.limit).toBe(1000);
    });
  });

  describe('difficulty mapping', () => {
    it('should map difficulty levels correctly', () => {
      expect(DIFFICULTY_MAP.Easy).toBe('EASY');
      expect(DIFFICULTY_MAP.Medium).toBe('MEDIUM');
      expect(DIFFICULTY_MAP.Hard).toBe('HARD');
    });

    it('should handle random difficulty', () => {
      const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
      expect(validDifficulties).toContain(DIFFICULTY_MAP.Random);
    });

    it('should have all expected difficulty keys', () => {
      const expectedKeys = ['Easy', 'Medium', 'Hard', 'Random'];
      const actualKeys = Object.keys(DIFFICULTY_MAP);

      expectedKeys.forEach(key => {
        expect(actualKeys).toContain(key);
      });
    });
  });

  describe('query structure validation', () => {
    it('should have proper GraphQL syntax', () => {
      const queries = [
        PROBLEM_LIST_QUERY,
        USER_PROFILE_QUERY,
        RECENT_SUBMISSIONS_QUERY,
        QUESTION_DETAIL_QUERY,
      ];

      queries.forEach(query => {
        // Should start with 'query'
        expect(query.trim().startsWith('query')).toBe(true);

        // Should have balanced braces
        const openBraces = (query.match(/{/g) || []).length;
        const closeBraces = (query.match(/}/g) || []).length;
        expect(openBraces).toBe(closeBraces);

        // Should have variables declared with $
        if (query.includes('$')) {
          expect(query).toMatch(/\$\w+:/);
        }
      });
    });

    it('should have consistent field naming', () => {
      // Check that field names follow expected patterns
      expect(PROBLEM_LIST_QUERY).toContain(
        'frontendQuestionId: questionFrontendId'
      );
      expect(PROBLEM_LIST_QUERY).toContain('paidOnly: isPaidOnly');
      expect(QUESTION_DETAIL_QUERY).toContain('questionFrontendId');
    });
  });
});
