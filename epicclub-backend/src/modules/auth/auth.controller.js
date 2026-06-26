const authService = require('./auth.service');
const db = require('../../config/db');
const env = require('../../config/env');

/**
 * Controller class managing secure HTTP authentication operations.
 */
class AuthController {
  /**
   * Registers a new user with email and password credentials.
   */
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const user = await authService.registerCredentials(name, email, password);

      if (user.status === 'pending_verification') {
        const { maskEmail } = require('../../utils/maskEmail');
        return res.status(201).json({
          success: true,
          status: 'pending_verification',
          message: 'Registration successful. Please check your email for a verification code.',
          userId: user.id,
          maskedEmail: maskEmail(user.email),
        });
      }

      if (user.status === 'pending') {
        return res.status(201).json({
          success: true,
          status: 'pending',
          message: 'Registration successful. Awaiting admin approval.',
          user,
        });
      }

      const tokens = await authService.generateTokens(user);
      return res.status(200).json({
        success: true,
        tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          committeeId: user.committee_id,
        },
      });
    } catch (error) {
      console.error('[AuthController.register Error]', error.message);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }

  /**
   * Logs in a user with email and password credentials.
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, status } = await authService.loginCredentials(email, password);

      if (status === 'pending_verification') {
        const { maskEmail } = require('../../utils/maskEmail');
        return res.status(202).json({
          status: 'pending_verification',
          message: 'Please verify your email address before logging in.',
          userId: user.id,
          maskedEmail: maskEmail(user.email),
        });
      }

      if (status === 'pending') {
        return res.status(202).json({
          status: 'pending',
          message: 'Awaiting admin approval',
        });
      }

      if (status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden',
        });
      }

      const tokens = await authService.generateTokens(user);
      return res.status(200).json({
        success: true,
        tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          committeeId: user.committee_id,
        },
      });
    } catch (error) {
      console.error('[AuthController.login Error]', error.message);
      const status = error.statusCode || 401;
      return res.status(status).json({
        success: false,
        message: error.message || 'Authentication failed',
      });
    }
  }

  /**
   * Authenticates user using Google ID token server-side validation.
   * Coordinates account state check (pending, rejected, approved).
   * 
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Next handler callback
   * @returns {Promise<import('express').Response>} Express HTTP response
   */
  async googleLogin(req, res, next) {
    try {
      const { id_token } = req.body;

      // 1. Validate the token server-side with Google APIs
      const profile = await authService.verifyGoogleToken(id_token);

      // 2. Perform database login or registration flow
      const { user, status } = await authService.handleGoogleUserFlow(profile);

      // 3. Process account state decisions
      if (status === 'pending_verification') {
        const { maskEmail } = require('../../utils/maskEmail');
        return res.status(202).json({
          status: 'pending_verification',
          message: 'Please verify your email address. A verification code has been sent to your inbox.',
          userId: user.id,
          maskedEmail: maskEmail(user.email),
        });
      }

      if (status === 'pending') {
        return res.status(202).json({
          status: 'pending',
          message: 'Awaiting admin approval',
        });
      }

      if (status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden',
        });
      }

      if (status === 'approved') {
        // Generate HS512 Access Token and random hashed Refresh Token
        const tokens = await authService.generateTokens(user);

        return res.status(200).json({
          success: true,
          tokens,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            committeeId: user.committee_id,
          },
        });
      }

      // Fallback fallback if status mismatch
      return res.status(403).json({
        success: false,
        message: 'Access forbidden',
      });
    } catch (error) {
      console.error('[AuthController.googleLogin Error]', error.message);
      const isDev = env.NODE_ENV === 'development';
      return res.status(401).json({
        success: false,
        message: isDev ? `Authentication failed: ${error.message}` : 'Authentication failed',
        ...(isDev && { stack: error.stack }),
      });
    }
  }

  /**
   * Renews Access Token and Rotates Refresh Token.
   * 
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Next handler callback
   * @returns {Promise<import('express').Response>} Express HTTP response
   */
  async refresh(req, res, next) {
    try {
      const { refresh_token } = req.body;

      // Rotate refresh token: revokes old one, issues new access + refresh pair
      const tokens = await authService.rotateRefreshToken(refresh_token);

      return res.status(200).json({
        success: true,
        tokens,
      });
    } catch (error) {
      console.error('[AuthController.refresh Error]', error.message);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }
  }

  /**
   * Revokes refresh token session and logs out the user.
   * 
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Next handler callback
   * @returns {Promise<import('express').Response>} Express HTTP response
   */
  async logout(req, res, next) {
    try {
      const { refresh_token } = req.body;

      if (refresh_token) {
        await authService.revokeRefreshToken(refresh_token);
      }

      return res.status(200).json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      console.error('[AuthController.logout Error]', error.message);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }
  }

  /**
   * Returns current authenticated user profile excluding sensitive fields.
   * 
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Next handler callback
   * @returns {Promise<import('express').Response>} Express HTTP response
   */
  async getMe(req, res, next) {
    try {
      // req.user has already been verified and populated by authenticateJWT middleware
      const userRes = await db.query(
        'SELECT id, email, name, avatar_url, role, status, committee_id, created_at FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userRes.rowCount === 0) {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed',
        });
      }

      const user = userRes.rows[0];

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatar_url,
          role: user.role,
          status: user.status,
          committeeId: user.committee_id,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      console.error('[AuthController.getMe Error]', error.message);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }
  }

  /**
   * Verifies a user's email address using the 6-digit OTP code.
   * 
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async verifyEmailOTP(req, res) {
    try {
      const { user_id, otp_code } = req.body;
      const verificationService = require('../../services/verificationService');
      const { user } = await verificationService.verifyEmailOTP(user_id, otp_code);

      return res.status(200).json({
        success: true,
        status: user.status,
        message: 'Email verified successfully! Your account is now awaiting admin approval.',
      });
    } catch (error) {
      console.error('[AuthController.verifyEmailOTP Error]', error.message);
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Verification failed',
      });
    }
  }

  /**
   * Verifies a user's email address using a magic link token.
   * 
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async verifyEmailLink(req, res) {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
      }

      const verificationService = require('../../services/verificationService');
      const { user } = await verificationService.verifyEmailLink(token);

      return res.status(200).json({
        success: true,
        status: user.status,
        message: 'Email verified successfully! Your account is now awaiting admin approval.',
      });
    } catch (error) {
      console.error('[AuthController.verifyEmailLink Error]', error.message);
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Verification failed',
      });
    }
  }

  /**
   * Resends the verification email to a user.
   * 
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async resendVerificationEmail(req, res) {
    try {
      const { user_id } = req.body;
      const verificationService = require('../../services/verificationService');
      await verificationService.resendVerificationEmail(user_id);

      return res.status(200).json({
        success: true,
        message: 'Verification email resent. Please check your inbox.',
      });
    } catch (error) {
      console.error('[AuthController.resendVerificationEmail Error]', error.message);
      const status = error.statusCode || 400;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to resend verification email',
      });
    }
  }
}

module.exports = new AuthController();
