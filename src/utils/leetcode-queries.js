// GraphQL query constants for LeetCode API

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

const USER_PROFILE_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
    }
  }
`;

const RECENT_SUBMISSIONS_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      titleSlug
      timestamp
    }
  }
`;

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

// Variable templates for common query patterns
const PROBLEM_LIST_VARIABLES = {
  categorySlug: '',
  limit: 1000,
  skip: 0,
  filters: {
    difficulty: 'MEDIUM', // Will be overridden
  },
};

const DIFFICULTY_MAP = {
  Easy: 'EASY',
  Medium: 'MEDIUM',
  Hard: 'HARD',
  Random: ['EASY', 'MEDIUM', 'HARD'][Math.floor(Math.random() * 3)],
};

module.exports = {
  PROBLEM_LIST_QUERY,
  USER_PROFILE_QUERY,
  RECENT_SUBMISSIONS_QUERY,
  QUESTION_DETAIL_QUERY,
  PROBLEM_LIST_VARIABLES,
  DIFFICULTY_MAP,
};
