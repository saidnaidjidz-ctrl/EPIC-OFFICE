/**
 * Masks an email address for safe display to the user.
 * Reveals first 2 chars of local part + domain.
 * 
 * Example: "johndoe@gmail.com" → "jo***@gmail.com"
 * 
 * @param {string} email - The full email address to mask
 * @returns {string} Masked email string
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;

  const [local, domain] = email.split('@');

  if (local.length <= 2) {
    return `${local}***@${domain}`;
  }

  const visibleChars = local.slice(0, 2);
  const maskedPart = '*'.repeat(Math.min(local.length - 2, 4));

  return `${visibleChars}${maskedPart}@${domain}`;
};

module.exports = { maskEmail };
