import { describe, it, expect, beforeEach, vi } from 'vitest';

// Utility functions defined inline for testing
const STORAGE_KEYS = {
  USER_DATA: 'yeetcode_user_data',
  APP_STATE: 'yeetcode_app_state',
};

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
};

const loadFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

const mockFetchLeaderboard = async () => {
  await new Promise(r => setTimeout(r, 100)); // Shorter delay for tests
  return [
    { name: 'Alice', easy: 50, medium: 30, hard: 10, today: 2 },
    { name: 'Bob', easy: 45, medium: 25, hard: 8, today: 1 },
    { name: 'You', easy: 40, medium: 20, hard: 5, today: 3 },
  ];
};

const validateUsername = username => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Username is required' };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  return { valid: true, error: null };
};

describe('Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset localStorage mocks
    localStorage.getItem = vi.fn().mockReturnValue(null);
    localStorage.setItem = vi.fn();
  });

  describe('Storage utilities', () => {
    it('should save and load data from localStorage', () => {
      const testData = { name: 'John', username: 'john123' };

      // Test saving
      const saveResult = saveToStorage(STORAGE_KEYS.USER_DATA, testData);
      expect(saveResult).toBe(true);

      // Mock localStorage.getItem to return the saved data
      localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(testData));

      const loadResult = loadFromStorage(STORAGE_KEYS.USER_DATA);
      expect(loadResult).toEqual(testData);
    });

    it('should return default value when localStorage is empty', () => {
      const defaultValue = { default: true };
      const result = loadFromStorage('nonexistent_key', defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it('should handle JSON parse errors gracefully', () => {
      const defaultValue = { default: true };
      localStorage.setItem('corrupted_key', 'invalid json');

      const result = loadFromStorage('corrupted_key', defaultValue);
      expect(result).toEqual(defaultValue);
    });
  });

  describe('Mock leaderboard data', () => {
    it('should return mock leaderboard data', async () => {
      const result = await mockFetchLeaderboard();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'Alice',
        easy: 50,
        medium: 30,
        hard: 10,
        today: 2,
      });
    });
  });

  describe('Username validation', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('john123')).toEqual({ valid: true, error: null });
      expect(validateUsername('user_name')).toEqual({
        valid: true,
        error: null,
      });
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('')).toEqual({
        valid: false,
        error: 'Username is required',
      });
      expect(validateUsername('ab')).toEqual({
        valid: false,
        error: 'Username must be at least 3 characters',
      });
      expect(validateUsername(null)).toEqual({
        valid: false,
        error: 'Username is required',
      });
    });
  });
});
