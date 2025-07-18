// LeetCode Service - Handles LeetCode API interactions
// Used for polling recent submissions during duels

/**
 * Fetch recent submissions for a user from LeetCode GraphQL API
 * @param {string} username - LeetCode username
 * @param {number} limit - Number of recent submissions to fetch (default: 5)
 * @returns {Promise<Array>} Array of recent submission objects
 */
export const fetchRecentSubmissions = async (username, limit = 5) => {
  if (!window.electronAPI?.fetchLeetCodeSubmissions) {
    throw new Error('fetchLeetCodeSubmissions API not available');
  }
  return await window.electronAPI.fetchLeetCodeSubmissions(username, limit);
};

/**
 * Check if a user has submitted a solution for a specific problem after a given timestamp
 * @param {string} username - LeetCode username
 * @param {string} problemSlug - Problem slug (e.g., "two-sum")
 * @param {number} afterTimestamp - Timestamp to check submissions after
 * @returns {Promise<Object|null>} Submission object if found, null otherwise
 */
export const checkSubmissionAfterTime = async (
  username,
  problemSlug,
  afterTimestamp
) => {
  try {
    const submissions = await fetchRecentSubmissions(username, 10);

    // Find submission for the specific problem after the given timestamp
    const matchingSubmission = submissions.find(submission => {
      const submissionTime = new Date(submission.timestamp).getTime();
      return (
        submission.titleSlug === problemSlug && submissionTime > afterTimestamp
      );
    });

    return matchingSubmission || null;
  } catch (error) {
    console.error('Error checking submission after time:', error);
    throw error;
  }
};

/**
 * Get a random LeetCode problem of specified difficulty
 * @param {string} difficulty - Problem difficulty (Easy/Medium/Hard)
 * @returns {Promise<Object>} Random problem object with slug, title, difficulty
 */
export const getRandomProblem = async difficulty => {
  if (!window.electronAPI?.fetchRandomProblem) {
    throw new Error('fetchRandomProblem API not available');
  }
  return await window.electronAPI.fetchRandomProblem(difficulty);
};

/**
 * Validate if a LeetCode username exists
 * @param {string} username - LeetCode username to validate
 * @returns {Promise<boolean>} True if username exists, false otherwise
 */
export const validateLeetCodeUsername = async username => {
  if (!window.electronAPI?.validateLeetCodeUsername) {
    throw new Error('validateLeetCodeUsername API not available');
  }

  try {
    const result = await window.electronAPI.validateLeetCodeUsername(username);

    // Handle API Gateway response format
    if (result.statusCode && result.body) {
      const parsedResult =
        typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
      return parsedResult.exists || false;
    }

    return result.exists || false;
  } catch (error) {
    console.error('Error validating LeetCode username:', error);
    return false;
  }
};
