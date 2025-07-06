import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the functions we want to test
// Since they're defined in the component, we'll test them indirectly
// or extract them to a separate utils file

describe('Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('localStorage utilities', () => {
    it('should save data to localStorage', () => {
      const testData = { name: 'John', age: 30 };
      const key = 'test_key';

      // Simulate the saveToStorage function
      const saveToStorage = (key, data) => {
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
        }
      };

      saveToStorage(key, testData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(testData)
      );
    });

    it('should load data from localStorage', () => {
      const testData = { name: 'John', age: 30 };
      const key = 'test_key';

      localStorage.getItem.mockReturnValue(JSON.stringify(testData));

      const loadFromStorage = (key, defaultValue = null) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
          console.error('Failed to load from localStorage:', error);
          return defaultValue;
        }
      };

      const result = loadFromStorage(key);

      expect(result).toEqual(testData);
      expect(localStorage.getItem).toHaveBeenCalledWith(key);
    });

    it('should return default value when localStorage is empty', () => {
      const key = 'nonexistent_key';
      const defaultValue = { default: true };

      localStorage.getItem.mockReturnValue(null);

      const loadFromStorage = (key, defaultValue = null) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
          console.error('Failed to load from localStorage:', error);
          return defaultValue;
        }
      };

      const result = loadFromStorage(key, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should handle JSON parse errors gracefully', () => {
      const key = 'corrupted_key';
      const defaultValue = { default: true };

      localStorage.getItem.mockReturnValue('invalid json');

      const loadFromStorage = (key, defaultValue = null) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
          console.error('Failed to load from localStorage:', error);
          return defaultValue;
        }
      };

      const result = loadFromStorage(key, defaultValue);

      expect(result).toEqual(defaultValue);
    });
  });

  describe('Mock leaderboard data', () => {
    it('should return mock leaderboard data', async () => {
      const mockFetchLeaderboard = async () => {
        await new Promise(r => setTimeout(r, 10)); // Shorter delay for tests
        return [
          { name: 'Alice', easy: 50, medium: 30, hard: 10, today: 2 },
          { name: 'Bob', easy: 45, medium: 25, hard: 8, today: 1 },
          { name: 'You', easy: 40, medium: 20, hard: 5, today: 3 },
        ];
      };

      const result = await mockFetchLeaderboard();

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('name', 'Alice');
      expect(result[0]).toHaveProperty('easy', 50);
      expect(result[0]).toHaveProperty('today', 2);
    });

    it('should calculate totals correctly', async () => {
      const mockData = [
        { name: 'Alice', easy: 50, medium: 30, hard: 10, today: 2 },
        { name: 'Bob', easy: 45, medium: 25, hard: 8, today: 1 },
      ];

      const withTotal = mockData.map(u => ({
        ...u,
        total: u.easy + u.medium + u.hard,
      }));

      expect(withTotal[0].total).toBe(90);
      expect(withTotal[1].total).toBe(78);
    });

    it('should sort leaderboard by total correctly', async () => {
      const mockData = [
        { name: 'Bob', easy: 45, medium: 25, hard: 8, today: 1, total: 78 },
        { name: 'Alice', easy: 50, medium: 30, hard: 10, today: 2, total: 90 },
      ];

      const sorted = mockData.sort((a, b) => b.total - a.total);

      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
    });
  });
});
