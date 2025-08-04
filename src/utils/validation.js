// Input validation and normalization utilities

const normalizeEmail = email => {
  if (typeof email !== 'string') {
    throw new Error('Email must be a string');
  }
  return email.trim().toLowerCase();
};

const normalizeUsername = username => {
  if (typeof username !== 'string') {
    throw new Error('Username must be a string');
  }
  return username.trim().toLowerCase();
};

const validateEmail = email => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  return true;
};

const validateUsername = username => {
  if (typeof username !== 'string') {
    throw new Error('Username must be a string');
  }
  if (username.length > 50) {
    throw new Error('Username too long (max 50 characters)');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw new Error('Username contains invalid characters');
  }
  return true;
};

const validateDisplayName = displayName => {
  if (typeof displayName !== 'string') {
    throw new Error('Display name must be a string');
  }
  if (displayName.length > 100) {
    throw new Error('Display name too long (max 100 characters)');
  }
  return true;
};

const validateGroupCode = code => {
  if (typeof code !== 'string') {
    throw new Error('Group code must be a string');
  }
  if (code.length > 20) {
    throw new Error('Group code too long (max 20 characters)');
  }
  if (!/^[A-Z0-9-]+$/i.test(code)) {
    throw new Error('Group code contains invalid characters');
  }
  return true;
};

const validateDifficulty = difficulty => {
  const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
  if (!validDifficulties.includes(difficulty?.toUpperCase())) {
    throw new Error('Invalid difficulty level');
  }
  return true;
};

const validateUrl = url => {
  if (typeof url !== 'string') {
    throw new Error('URL must be a string');
  }

  try {
    const urlObj = new URL(url);
    const allowedProtocols = ['https:', 'http:', 'mailto:'];
    const allowedDomains = ['leetcode.com', 'wa.me', 't.me'];

    if (!allowedProtocols.includes(urlObj.protocol)) {
      throw new Error('Protocol not allowed');
    }

    if (
      urlObj.protocol !== 'mailto:' &&
      !allowedDomains.some(domain => urlObj.hostname.endsWith(domain))
    ) {
      throw new Error('Domain not allowed');
    }

    return true;
  } catch (error) {
    throw new Error('Invalid URL format');
  }
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sanitizeInput = (input, maxLength = 1000) => {
  if (typeof input !== 'string') {
    return String(input);
  }
  return input.trim().slice(0, maxLength);
};

module.exports = {
  normalizeEmail,
  normalizeUsername,
  validateEmail,
  validateUsername,
  validateDisplayName,
  validateGroupCode,
  validateDifficulty,
  validateUrl,
  generateVerificationCode,
  sanitizeInput,
};
