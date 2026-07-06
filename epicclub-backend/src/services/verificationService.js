const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');
const env = require('../config/env');
const {
  emailVerificationTemplate,
  awaitingApprovalTemplate,
  accountApprovedTemplate,
  accountRejectedTemplate,
} = require('./emailTemplates');

/**
 * Creates a configured nodemailer transporter using SMTP env vars.
 * Supports Gmail, Mailgun SMTP, SendGrid, etc.
 * 
 * @returns {import('nodemailer').Transporter}
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // true for port 465 (SSL), false for 587 (TLS/STARTTLS)
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
};

/**
 * Sends an email using nodemailer. Gracefully logs errors without crashing app.
 * 
 * @param {object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML body
 * @param {string} params.text - Plain-text body (fallback)
 * @returns {Promise<void>}
 */
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (
      !env.SMTP_USER ||
      env.SMTP_USER === 'your-email@gmail.com' ||
      env.SMTP_USER === 'test@gmail.com' ||
      env.SMTP_USER.includes('your-email')
    ) {
      console.log('\n✉️  [EMAIL BYPASS] Developer Mode: Email was not sent via SMTP.');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body:\n${text || html}\n`);
      return;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Epic Club" <${env.SMTP_FROM}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`[EMAIL] Sent "${subject}" to ${to}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send "${subject}" to ${to}:`, error.message);
    // Don't re-throw; email failures are non-fatal
  }
};

/**
 * Computes a SHA-256 hex hash of a value.
 * Used to store OTP codes and magic link tokens securely.
 * 
 * @param {string} value
 * @returns {string} hex hash
 */
const hashValue = (value) => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

/**
 * Generates and stores a new email verification record for a user.
 * Deletes any existing unverified record for that user first.
 * 
 * @param {string} userId - User UUID
 * @param {string} email - User email
 * @returns {Promise<{otpCode: string, linkToken: string}>} Raw (unhashed) values for the email
 */
const createVerificationRecord = async (userId, email) => {
  // 1. Generate a 6-digit OTP code
  const otpCode = String(crypto.randomInt(100000, 999999));
  const otpHash = hashValue(otpCode);
  const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // 2. Generate a high-entropy magic link token
  const linkToken = crypto.randomBytes(40).toString('hex');
  const linkHash = hashValue(linkToken);
  const linkExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // 3. Delete any existing unverified record for this user (upsert-style)
  await db.query(
    'DELETE FROM email_verifications WHERE user_id = $1 AND verified = false',
    [userId]
  );

  // 4. Insert new verification record
  await db.query(
    `INSERT INTO email_verifications
       (user_id, email, otp_code_hash, otp_expires_at, link_token_hash, link_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, email, otpHash, otpExpiresAt, linkHash, linkExpiresAt]
  );

  return { otpCode, linkToken };
};

/**
 * Sends the email verification email (OTP + magic link) to a new user.
 * 
 * @param {object} user - User object with id, email, name
 * @returns {Promise<void>}
 */
const sendVerificationEmail = async (user) => {
  const { otpCode, linkToken } = await createVerificationRecord(user.id, user.email);

  const magicLinkUrl = `${env.FRONTEND_URL}/verify-email?token=${linkToken}`;

  const { subject, html, text } = emailVerificationTemplate({
    name: user.name,
    otpCode,
    magicLinkUrl,
  });

  await sendEmail({ to: user.email, subject, html, text });
};

/**
 * Verifies a user's email address using the 6-digit OTP code.
 * Marks the record as verified and updates user status to 'pending'.
 * 
 * @param {string} userId - User UUID
 * @param {string} otpCode - Raw 6-digit OTP entered by user
 * @returns {Promise<{user: object}>} Updated user object
 * @throws {Error} With statusCode for client-safe error messages
 */
const verifyEmailOTP = async (userId, otpCode) => {
  const otpHash = hashValue(otpCode.trim());

  // Look up the verification record
  const verifyRes = await db.query(
    `SELECT * FROM email_verifications
     WHERE user_id = $1 AND verified = false
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (verifyRes.rowCount === 0) {
    const err = new Error('No pending verification found for this account');
    err.statusCode = 404;
    throw err;
  }

  const record = verifyRes.rows[0];

  // Check OTP match
  if (record.otp_code_hash !== otpHash) {
    const err = new Error('Invalid verification code');
    err.statusCode = 400;
    throw err;
  }

  // Check OTP expiry
  if (new Date() > new Date(record.otp_expires_at)) {
    const err = new Error('Verification code has expired. Please request a new one.');
    err.statusCode = 410;
    throw err;
  }

  return _completeVerification(record.user_id);
};

/**
 * Verifies a user's email address using the magic link token.
 * 
 * @param {string} linkToken - Raw magic link token from URL
 * @returns {Promise<{user: object}>} Updated user object
 * @throws {Error} With statusCode for client-safe error messages
 */
const verifyEmailLink = async (linkToken) => {
  const linkHash = hashValue(linkToken.trim());

  // Look up by link token hash
  const verifyRes = await db.query(
    `SELECT * FROM email_verifications
     WHERE link_token_hash = $1 AND verified = false`,
    [linkHash]
  );

  if (verifyRes.rowCount === 0) {
    const err = new Error('Invalid or already used verification link');
    err.statusCode = 404;
    throw err;
  }

  const record = verifyRes.rows[0];

  // Check link expiry
  if (new Date() > new Date(record.link_expires_at)) {
    const err = new Error('This verification link has expired. Please request a new one.');
    err.statusCode = 410;
    throw err;
  }

  return _completeVerification(record.user_id);
};

/**
 * Internal helper: marks verification as complete, updates user to 'pending', sends follow-up email.
 * 
 * @param {string} userId - User UUID
 * @returns {Promise<{user: object}>}
 * @private
 */
const _completeVerification = async (userId) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Mark verification record as used
    await client.query(
      'UPDATE email_verifications SET verified = true, updated_at = NOW() WHERE user_id = $1 AND verified = false',
      [userId]
    );

    // 2. Update user status: pending_verification → pending
    const userRes = await client.query(
      `UPDATE users SET status = 'pending', updated_at = NOW()
       WHERE id = $1 AND status = 'pending_verification'
       RETURNING id, email, name, role, status, committee_id`,
      [userId]
    );

    if (userRes.rowCount === 0) {
      // User already verified or wrong status (idempotent — not an error)
      const existingUser = await client.query(
        'SELECT id, email, name, role, status, committee_id FROM users WHERE id = $1',
        [userId]
      );
      await client.query('COMMIT');
      return { user: existingUser.rows[0] };
    }

    const user = userRes.rows[0];

    await client.query('COMMIT');

    // 3. Send "awaiting approval" email (non-blocking)
    const { subject, html, text } = awaitingApprovalTemplate({ name: user.name });
    sendEmail({ to: user.email, subject, html, text }).catch(() => {});

    return { user };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Resends the verification email to a user, with rate limiting.
 * Maximum 5 resends; enforces 60-second cooldown between sends.
 * 
 * @param {string} userId - User UUID
 * @returns {Promise<void>}
 * @throws {Error} With statusCode for client-safe error messages
 */
const resendVerificationEmail = async (userId) => {
  // Fetch user
  const userRes = await db.query(
    'SELECT id, email, name, status FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (userRes.rowCount === 0) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const user = userRes.rows[0];

  if (user.status !== 'pending_verification') {
    const err = new Error('Account is not pending email verification');
    err.statusCode = 400;
    throw err;
  }

  // Check for existing verification record and rate limits
  const recordRes = await db.query(
    'SELECT * FROM email_verifications WHERE user_id = $1 AND verified = false ORDER BY created_at DESC LIMIT 1',
    [userId]
  );

  if (recordRes.rowCount > 0) {
    const record = recordRes.rows[0];

    // Max 5 resends
    if (record.resend_count >= 5) {
      const err = new Error('Maximum resend attempts reached. Please contact support.');
      err.statusCode = 429;
      throw err;
    }

    // 60-second cooldown
    if (record.last_resent_at) {
      const secondsSinceLastSend = (Date.now() - new Date(record.last_resent_at).getTime()) / 1000;
      if (secondsSinceLastSend < 60) {
        const remaining = Math.ceil(60 - secondsSinceLastSend);
        const err = new Error(`Please wait ${remaining} seconds before requesting another email`);
        err.statusCode = 429;
        throw err;
      }
    }

    // Update resend count
    await db.query(
      'UPDATE email_verifications SET resend_count = resend_count + 1, last_resent_at = NOW() WHERE id = $1',
      [record.id]
    );
  }

  // Send a fresh verification email
  await sendVerificationEmail(user);
};

/**
 * Sends the account approved email notification.
 * 
 * @param {object} user - User object with email, name
 * @param {string} role - Approved role
 * @returns {Promise<void>}
 */
const sendApprovalEmail = async (user, role) => {
  const loginUrl = `${env.FRONTEND_URL}/login`;
  const { subject, html, text } = accountApprovedTemplate({ name: user.name, role, loginUrl });
  await sendEmail({ to: user.email, subject, html, text });
};

/**
 * Sends the account rejected email notification.
 * 
 * @param {object} user - User object with email, name
 * @param {string} [reason] - Rejection reason from admin
 * @returns {Promise<void>}
 */
const sendRejectionEmail = async (user, reason) => {
  const { subject, html, text } = accountRejectedTemplate({ name: user.name, reason });
  await sendEmail({ to: user.email, subject, html, text });
};

module.exports = {
  sendVerificationEmail,
  verifyEmailOTP,
  verifyEmailLink,
  resendVerificationEmail,
  sendApprovalEmail,
  sendRejectionEmail,
};
