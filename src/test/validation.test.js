import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  normalizeUsername,
  validateEmail,
  validateUsername,
  validateDisplayName,
  validateGroupCode,
  validateDifficulty,
  generateVerificationCode,
  sanitizeInput,
} from '../utils/validation.js';

describe('Validation Utilities', () => {
  describe('normalizeEmail', () => {
    it('should normalize email to lowercase and trim', () => {
      expect(normalizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
      expect(normalizeEmail('User@Domain.org')).toBe('user@domain.org');
    });

    it('should throw error for non-string input', () => {
      expect(() => normalizeEmail(123)).toThrow('Email must be a string');
      expect(() => normalizeEmail(null)).toThrow('Email must be a string');
    });
  });

  describe('normalizeUsername', () => {
    it('should normalize username to lowercase and trim', () => {
      expect(normalizeUsername('  USERNAME123  ')).toBe('username123');
      expect(normalizeUsername('TestUser')).toBe('testuser');
    });

    it('should throw error for non-string input', () => {
      expect(() => normalizeUsername(123)).toThrow('Username must be a string');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.org')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(() => validateEmail('invalid')).toThrow('Invalid email format');
      expect(() => validateEmail('test@')).toThrow('Invalid email format');
      expect(() => validateEmail('@domain.com')).toThrow(
        'Invalid email format'
      );
      expect(() => validateEmail('test.domain.com')).toThrow(
        'Invalid email format'
      );
    });
  });

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('test_user')).toBe(true);
      expect(validateUsername('user-name')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(() => validateUsername('a'.repeat(51))).toThrow(
        'Username too long'
      );
      expect(() => validateUsername('user@name')).toThrow(
        'Username contains invalid characters'
      );
      expect(() => validateUsername('user name')).toThrow(
        'Username contains invalid characters'
      );
      expect(() => validateUsername(123)).toThrow('Username must be a string');
    });
  });

  describe('validateDisplayName', () => {
    it('should validate correct display names', () => {
      expect(validateDisplayName('John Doe')).toBe(true);
      expect(validateDisplayName('Test User 123')).toBe(true);
    });

    it('should reject invalid display names', () => {
      expect(() => validateDisplayName('a'.repeat(101))).toThrow(
        'Display name too long'
      );
      expect(() => validateDisplayName(123)).toThrow(
        'Display name must be a string'
      );
    });
  });

  describe('validateGroupCode', () => {
    it('should validate correct group codes', () => {
      expect(validateGroupCode('ABC123')).toBe(true);
      expect(validateGroupCode('TEST-CODE')).toBe(true);
    });

    it('should reject invalid group codes', () => {
      expect(() => validateGroupCode('a'.repeat(21))).toThrow(
        'Group code too long'
      );
      expect(() => validateGroupCode('code@123')).toThrow(
        'Group code contains invalid characters'
      );
      expect(() => validateGroupCode(123)).toThrow(
        'Group code must be a string'
      );
    });
  });

  describe('validateDifficulty', () => {
    it('should validate correct difficulties', () => {
      expect(validateDifficulty('EASY')).toBe(true);
      expect(validateDifficulty('MEDIUM')).toBe(true);
      expect(validateDifficulty('HARD')).toBe(true);
      expect(validateDifficulty('easy')).toBe(true); // case insensitive
    });

    it('should reject invalid difficulties', () => {
      expect(() => validateDifficulty('INVALID')).toThrow(
        'Invalid difficulty level'
      );
      expect(() => validateDifficulty('')).toThrow('Invalid difficulty level');
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate 6-digit codes', () => {
      const code = generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    });

    it('should generate different codes', () => {
      const code1 = generateVerificationCode();
      const code2 = generateVerificationCode();
      // Very unlikely to be the same (1 in 1,000,000 chance)
      expect(code1).not.toBe(code2);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim and limit string length', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('a'.repeat(1500), 10)).toBe('a'.repeat(10));
    });

    it('should convert non-strings to strings', () => {
      expect(sanitizeInput(123)).toBe('123');
      expect(sanitizeInput(true)).toBe('true');
    });
  });
});
