/**
 * Recursively sanitizes a string or object values to protect against XSS and injection.
 * Trims whitespace and escapes dangerous characters to safe HTML entities.
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') {
    if (typeof data === 'string') {
      return sanitizeString(data);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  const sanitized = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      sanitized[key] = sanitizeData(data[key]);
    }
  }
  return sanitized;
};

/**
 * Express middleware that filters request data fields globally.
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeData(req.body);
  }
  if (req.query) {
    req.query = sanitizeData(req.query);
  }
  if (req.params) {
    req.params = sanitizeData(req.params);
  }
  next();
};

module.exports = {
  sanitizeInput,
  sanitizeString,
};
