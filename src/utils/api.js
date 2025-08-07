const axios = require('axios');
const config = require('./config');

class FastAPIClient {
  constructor() {
    this.baseURL = config.fastApiUrl;
    this.timeout = config.fastApiTimeout;
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async request(method, endpoint, data = null) {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        data,
        headers: this.headers,
        timeout: this.timeout,
      });

      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(
          response.data.error || `Failed to ${method} ${endpoint}`
        );
      }
    } catch (error) {
      if (error.response) {
        throw new Error(
          error.response.data?.error || `API error: ${error.response.status}`
        );
      }
      throw error;
    }
  }

  async get(endpoint) {
    return this.request('GET', endpoint);
  }

  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  async put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  }

  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }
}

class LeetCodeGraphQLClient {
  constructor() {
    this.url = config.leetCodeGraphQLUrl;
    this.timeout = config.leetCodeTimeout;
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': config.userAgent,
    };
  }

  async query(query, variables = {}) {
    try {
      const response = await axios.post(
        this.url,
        {
          query,
          variables,
        },
        {
          headers: this.headers,
          timeout: this.timeout,
        }
      );

      const data = response.data;
      if (data.errors) {
        console.error(
          '[ERROR][LeetCodeGraphQLClient] GraphQL errors:',
          data.errors
        );
        throw new Error('GraphQL query failed: ' + JSON.stringify(data.errors));
      }

      return data.data;
    } catch (error) {
      console.error(
        '[ERROR][LeetCodeGraphQLClient] Query failed:',
        error.message
      );
      throw error;
    }
  }

  async fetchRandomProblems(difficulty, limit = 1000) {
    // Map difficulty to what LeetCode API expects
    const difficultyMap = {
      Easy: 'EASY',
      Medium: 'MEDIUM',
      Hard: 'HARD',
      Random: ['EASY', 'MEDIUM', 'HARD'][Math.floor(Math.random() * 3)],
    };
    const leetcodeDifficulty =
      difficultyMap[difficulty] || difficulty.toUpperCase();

    const PROBLEM_LIST_QUERY = `
      query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(
          categorySlug: $categorySlug
          limit: $limit
          skip: $skip
          filters: $filters
        ) {
          total: totalNum
          questions: data {
            title
            titleSlug
            difficulty
            frontendQuestionId: questionFrontendId
            paidOnly: isPaidOnly
            topicTags {
              name
            }
          }
        }
      }
    `;

    const variables = {
      categorySlug: '',
      limit,
      skip: 0,
      filters: {
        difficulty: leetcodeDifficulty,
      },
    };

    const data = await this.query(PROBLEM_LIST_QUERY, variables);
    const freeProblems = data.problemsetQuestionList.questions.filter(
      problem => !problem.paidOnly
    );

    if (freeProblems.length === 0) {
      throw new Error(`No free problems found for difficulty: ${difficulty}`);
    }

    return freeProblems;
  }

  async selectRandomProblem(difficulty) {
    const problems = await this.fetchRandomProblems(difficulty);
    return problems[Math.floor(Math.random() * problems.length)];
  }

  async validateUsername(username) {
    const USER_PROFILE_QUERY = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
        }
      }
    `;

    const normalizedUsername = username.toLowerCase();
    const variables = { username: normalizedUsername };

    try {
      const data = await this.query(USER_PROFILE_QUERY, variables);
      const matchedUser = data?.matchedUser;
      const exists = !!matchedUser && !!matchedUser.username;

      return {
        exists,
        error: exists ? null : 'Username not found on LeetCode',
      };
    } catch (error) {
      // Handle the specific case where user doesn't exist
      if (error.message.includes('That user does not exist')) {
        return {
          exists: false,
          error: 'Username not found on LeetCode',
        };
      }
      throw error;
    }
  }

  async fetchRecentSubmissions(username, limit = 5) {
    const RECENT_SUBMISSIONS_QUERY = `
      query recentAcSubmissions($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          titleSlug
          timestamp
        }
      }
    `;

    const variables = { username, limit };

    try {
      const data = await this.query(RECENT_SUBMISSIONS_QUERY, variables);
      const submissions = data.recentAcSubmissionList || [];

      return submissions.map(sub => ({
        titleSlug: sub.titleSlug,
        timestamp: new Date(parseInt(sub.timestamp) * 1000).toISOString(),
        statusDisplay: 'Accepted',
        lang: 'unknown',
      }));
    } catch (error) {
      console.error('[ERROR][fetchRecentSubmissions]', error);
      return [];
    }
  }

  async fetchProblemDetails(slug) {
    const QUESTION_DETAIL_QUERY = `
      query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          title
          titleSlug
          questionFrontendId
          difficulty
          content
          topicTags {
            name
          }
          hints
          sampleTestCase
        }
      }
    `;

    const variables = { titleSlug: slug };
    const data = await this.query(QUESTION_DETAIL_QUERY, variables);

    if (!data.question) {
      throw new Error('Question not found');
    }

    return data.question;
  }
}

// Create singleton instances
const fastApiClient = new FastAPIClient();
const leetCodeClient = new LeetCodeGraphQLClient();

module.exports = {
  FastAPIClient,
  LeetCodeGraphQLClient,
  fastApiClient,
  leetCodeClient,
};
