const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const db = require('../../config/db');
const env = require('../../config/env');

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/**
 * Computes a secure SHA-256 hash of a token string.
 * Used to hash refresh tokens before database storage.
 * 
 * @param {string} token - The raw token string
 * @returns {string} Hex-encoded SHA-256 hash
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Validates Google ID token server-side using Google's official library.
 * Enforces audience check matching our GOOGLE_CLIENT_ID.
 * 
 * @param {string} idToken - The Google ID token sent by client
 * @returns {Promise<{googleId: string, email: string, name: string, avatarUrl: string}>} Verified Google user profile
 * @throws {Error} Generic authentication failure error
 */
const verifyGoogleToken = async (idToken) => {
  try {
    console.log('[AUTH] Verifying with Google...');
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('[AUTH] Google verification result:', {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      aud: payload.aud,
    });

    if (!payload) {
      throw new Error('No payload returned from Google ticket verification');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    };
  } catch (error) {
    console.error('[Google Verification Error]', error.message);
    throw new Error('Authentication failed: ' + error.message);
  }
};

/**
 * Generates an Access Token (15m, signed with HS512) and a high-entropy random Refresh Token (7d, stored hashed in DB).
 * 
 * @param {{id: string, email: string, role: string, status: string, committee_id: string}} user - User DB row
 * @returns {Promise<{accessToken: string, refreshToken: string}>} Raw tokens for the user
 */
const generateTokens = async (user) => {
  // 1. Sign Access Token with HS512 algorithm and short expiry (15m)
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      committee_id: user.committee_id,
    },
    env.JWT_SECRET,
    { algorithm: 'HS512', expiresIn: '2h' }
  );

  // 2. Generate random high-entropy refresh token (never store raw token)
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // 3. Store hash in PostgreSQL
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  return {
    accessToken,
    refreshToken: rawRefreshToken,
  };
};

/**
 * Handles server-side user check or creation based on verified Google profile.
 * 
 * @param {{googleId: string, email: string, name: string, avatarUrl: string}} profile - Verified Google user profile
 * @returns {Promise<{user: any, status: 'pending'|'rejected'|'approved'}>} Resulting user structure
 */
const handleGoogleUserFlow = async (profile) => {
  // Check if user exists by email and is active (not soft-deleted)
  let userRes = await db.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [profile.email]);
  let user;
  let isNewUser = false;

  if (userRes.rowCount === 0) {
    // Count existing users to determine role (first user = president)
    const userCountRes = await db.query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
    const totalUsers = parseInt(userCountRes.rows[0].count, 10);
    const role = totalUsers === 0 ? 'president' : 'member';
    // Google has already verified the user's email, so skip email verification
    // and go straight to pending (awaiting admin approval) for non-president users
    const status = totalUsers === 0 ? 'approved' : 'pending';

    // New user: create with pending status (email already verified via Google)
    const insertRes = await db.query(
      `INSERT INTO users (google_id, email, name, avatar_url, role, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [profile.googleId, profile.email, profile.name, profile.avatarUrl, role, status]
    );
    user = insertRes.rows[0];
    isNewUser = true;
  } else {
    user = userRes.rows[0];

    // Ensure google_id and avatar_url are linked if they were empty
    if (!user.google_id) {
      const updateRes = await db.query(
        'UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), updated_at = NOW() WHERE id = $3 RETURNING *',
        [profile.googleId, profile.avatarUrl, user.id]
      );
      user = updateRes.rows[0];
    }

    // If an existing user registered via credentials (pending_verification) and now signs in
    // with Google, auto-upgrade their email verification status to 'pending' (admin approval).
    if (user.status === 'pending_verification') {
      const upgradeRes = await db.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['pending', user.id]
      );
      user = upgradeRes.rows[0];
    }
  }

  return {
    user,
    status: user.status,
  };
};

/**
 * Registers a new user with email and password credentials.
 * Automatically designates the first user as 'president' (approved), and subsequent users as 'member' (pending).
 * 
 * @param {string} name - User full name
 * @param {string} email - User email address
 * @param {string} password - Raw password string
 * @returns {Promise<any>} Created user record
 */
const registerCredentials = async (name, email, password) => {
  // Check if user already exists
  const existingRes = await db.query(
    'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email]
  );
  if (existingRes.rowCount > 0) {
    const err = new Error('Email address already registered');
    err.statusCode = 400;
    throw err;
  }

  // Count existing users to decide the role of the new user
  const userCountRes = await db.query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
  const totalUsers = parseInt(userCountRes.rows[0].count, 10);

  // First user is approved President (skips verification). Everyone else must verify email first.
  const role = totalUsers === 0 ? 'president' : 'member';
  const status = totalUsers === 0 ? 'approved' : 'pending_verification';

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert new user
  const insertRes = await db.query(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, status, committee_id, created_at`,
    [name, email, passwordHash, role, status]
  );

  const user = insertRes.rows[0];

  // Trigger verification email for non-president users (non-blocking)
  if (status === 'pending_verification') {
    const { sendVerificationEmail } = require('../../services/verificationService');
    sendVerificationEmail(user).catch((err) => {
      console.error('[AUTH] Failed to send verification email:', err.message);
    });
  }

  return user;
};

/**
 * Validates user credentials and logs in the user.
 * 
 * @param {string} email - User email address
 * @param {string} password - Raw password string
 * @returns {Promise<{user: any, status: string}>} Authenticated user
 */
const loginCredentials = async (email, password) => {
  const userRes = await db.query(
    'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
    [email]
  );

  if (userRes.rowCount === 0) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const user = userRes.rows[0];

  if (!user.password_hash) {
    const err = new Error('Account associated with Google Login. Please sign in with Google.');
    err.statusCode = 400;
    throw err;
  }

  // Verify password hash
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  return {
    user,
    status: user.status,
  };
};

/**
 * Validates a refresh token, revokes it, and issues a new access/refresh token pair (rotation).
 * 
 * @param {string} rawRefreshToken - Incoming raw refresh token string
 * @returns {Promise<{accessToken: string, refreshToken: string}>} New tokens
 */
const rotateRefreshToken = async (rawRefreshToken) => {
  const tokenHash = hashToken(rawRefreshToken);

  // 1. Look up unrevoked, unexpired token hash in database
  const tokenRes = await db.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()',
    [tokenHash]
  );

  if (tokenRes.rowCount === 0) {
    throw new Error('Authentication failed');
  }

  const tokenRecord = tokenRes.rows[0];

  // 2. Fetch active, approved user profile
  const userRes = await db.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [tokenRecord.user_id]);
  if (userRes.rowCount === 0) {
    throw new Error('Authentication failed');
  }

  const user = userRes.rows[0];
  if (user.status !== 'approved') {
    throw new Error('Authentication failed');
  }

  // 3. Perform rotation: Revoke the old refresh token
  await db.query(
    'UPDATE refresh_tokens SET revoked = true WHERE id = $1',
    [tokenRecord.id]
  );

  // 4. Issue and return new tokens
  return generateTokens(user);
};

/**
 * Revokes a refresh token in the database.
 * 
 * @param {string} rawRefreshToken - The raw refresh token to revoke
 * @returns {Promise<void>}
 */
const revokeRefreshToken = async (rawRefreshToken) => {
  const tokenHash = hashToken(rawRefreshToken);
  await db.query(
    'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
    [tokenHash]
  );
};

module.exports = {
  verifyGoogleToken,
  generateTokens,
  handleGoogleUserFlow,
  registerCredentials,
  loginCredentials,
  rotateRefreshToken,
  revokeRefreshToken,
};
