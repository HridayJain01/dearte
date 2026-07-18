import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/index.js';
import {
  COOKIE_NAMES,
  accessCookieOptions,
  generateOtp,
  hashOtp,
  hashRefreshToken,
  otpMatches,
  refreshCookieOptions,
  refreshTokenMatches,
  signAccessToken,
  signRefreshToken,
  userDto,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/auth.js';
import {
  asString,
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from '../utils/validation.js';
import { deliverResetOtp } from '../services/passwordResetDelivery.js';
import { sendError, sendSuccess } from '../utils/responses.js';

const router = express.Router();

// Session refresh is a normal part of browsing, so it gets a roomier budget
// than the credential-handling endpoints below.
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tight budget for anything that accepts a password, an email or an OTP:
// these are the endpoints worth brute-forcing.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, data: null, message: 'Too many attempts. Please try again later.' },
});

router.use(sessionLimiter);

const MAX_OTP_ATTEMPTS = 5;

/**
 * Login failures must not reveal whether the email exists, so every failure
 * path returns the same message and status.
 */
const INVALID_CREDENTIALS = 'Invalid credentials';

function setSessionCookies(res, accessToken, refreshToken) {
  res.cookie(COOKIE_NAMES.access, accessToken, accessCookieOptions());
  res.cookie(COOKIE_NAMES.refresh, refreshToken, refreshCookieOptions());
}

function clearSessionCookies(res) {
  res.clearCookie(COOKIE_NAMES.access, accessCookieOptions());
  res.clearCookie(COOKIE_NAMES.refresh, refreshCookieOptions());
}

router.post('/login', credentialLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== 'string' || !password) {
    return sendError(res, INVALID_CREDENTIALS, 401);
  }

  const user = await User.findOne({ email });

  // Hash even when the user is missing so response time does not disclose
  // whether the address is registered.
  const passwordHash = user?.passwordHash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const isValid = await bcrypt.compare(password, passwordHash);

  if (!user || !isValid) {
    return sendError(res, INVALID_CREDENTIALS, 401);
  }

  if (user.status !== 'Active') {
    return sendError(res, 'Your account is awaiting admin activation', 403);
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokens = [...(user.refreshTokens || []), hashRefreshToken(refreshToken)].slice(-10);
  await user.save();

  setSessionCookies(res, accessToken, refreshToken);
  return sendSuccess(res, { user: userDto(user) }, 'Login successful');
});

router.get('/me', async (req, res) => {
  const refreshToken = req.cookies[COOKIE_NAMES.refresh];
  const accessToken = req.cookies[COOKIE_NAMES.access];

  if (!accessToken && !refreshToken) {
    return sendError(res, 'No active session', 401);
  }

  try {
    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      const user = await User.findById(payload.sub);
      if (!user) return sendError(res, 'User not found', 401);
      return sendSuccess(res, { user: userDto(user) });
    }
  } catch (error) {
    // fall through to refresh flow
  }

  if (!refreshToken) {
    return sendError(res, 'Session expired', 401);
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);

    if (!user || !refreshTokenMatches(user.refreshTokens, refreshToken)) {
      clearSessionCookies(res);
      return sendError(res, 'Session expired', 401);
    }

    const newAccessToken = signAccessToken(user);
    res.cookie(COOKIE_NAMES.access, newAccessToken, accessCookieOptions());
    return sendSuccess(res, { user: userDto(user) });
  } catch (error) {
    clearSessionCookies(res);
    return sendError(res, 'Session expired', 401);
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies[COOKIE_NAMES.refresh];
  if (!refreshToken) return sendError(res, 'Refresh token missing', 401);

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);

    if (!user || !refreshTokenMatches(user.refreshTokens, refreshToken)) {
      clearSessionCookies(res);
      return sendError(res, 'Invalid session', 401);
    }

    const nextRefreshToken = signRefreshToken(user);
    const nextAccessToken = signAccessToken(user);
    const usedDigest = hashRefreshToken(refreshToken);
    user.refreshTokens = (user.refreshTokens || [])
      .filter((digest) => digest !== usedDigest)
      .concat(hashRefreshToken(nextRefreshToken))
      .slice(-10);
    await user.save();

    setSessionCookies(res, nextAccessToken, nextRefreshToken);
    return sendSuccess(res, { user: userDto(user) }, 'Session refreshed');
  } catch (error) {
    clearSessionCookies(res);
    return sendError(res, 'Invalid session', 401);
  }
});

router.post('/register', credentialLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const name = asString(req.body?.customerName, { maxLength: 120 });
  const password = req.body?.password;

  if (!name) {
    return sendError(res, 'Name is required');
  }

  if (!isValidEmail(email)) {
    return sendError(res, 'A valid email address is required');
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return sendError(res, passwordError);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return sendError(res, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Build the document field by field: spreading req.body would let a caller
  // set `role: "admin"` or `status: "Active"` at signup.
  const user = await User.create({
    name,
    email,
    mobile: asString(req.body?.mobile, { maxLength: 32 }),
    address: asString(req.body?.address, { maxLength: 500 }),
    city: asString(req.body?.city, { maxLength: 120 }),
    state: asString(req.body?.state, { maxLength: 120 }),
    country: asString(req.body?.country, { maxLength: 120 }),
    pinCode: asString(req.body?.pinCode, { maxLength: 20 }),
    companyName: asString(req.body?.companyName, { maxLength: 200 }),
    gstNumber: asString(req.body?.gstNumber, { maxLength: 32 }),
    passwordHash,
    role: 'buyer',
    status: 'Inactive',
    registeredAt: new Date(),
    kycDocuments: ['GST Certificate'],
  });

  return sendSuccess(res, { user: userDto(user) }, 'Registration submitted. Your account will be activated by the admin team.');
});

router.post('/forgot-password', credentialLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const genericResponse = () =>
    sendSuccess(res, { otpSent: true }, 'If the account exists, reset instructions have been sent.');

  if (!isValidEmail(email)) {
    return genericResponse();
  }

  const user = await User.findOne({ email });
  if (!user) {
    return genericResponse();
  }

  const otp = generateOtp();
  user.resetOtp = {
    code: hashOtp(otp),
    expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    attempts: 0,
  };
  await user.save();

  // The code is delivered out of band. Returning it in the HTTP response would
  // let anyone who knows an email address take over that account.
  await deliverResetOtp(user, otp);

  return genericResponse();
});

router.post('/reset-password', credentialLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const otp = asString(req.body?.otp, { maxLength: 12 });
  const newPassword = req.body?.newPassword;

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return sendError(res, passwordError);
  }

  const user = isValidEmail(email) ? await User.findOne({ email }) : null;

  // One message for every failure mode, so this endpoint cannot be used to
  // enumerate which email addresses have accounts.
  const invalid = () => sendError(res, 'Invalid or expired reset code', 400);

  if (!user || !user.resetOtp?.code || !user.resetOtp.expiresAt) {
    return invalid();
  }

  if (user.resetOtp.expiresAt < new Date()) {
    user.resetOtp = { code: '', expiresAt: null, attempts: 0 };
    await user.save();
    return invalid();
  }

  if ((user.resetOtp.attempts || 0) >= MAX_OTP_ATTEMPTS) {
    user.resetOtp = { code: '', expiresAt: null, attempts: 0 };
    await user.save();
    return invalid();
  }

  if (!otpMatches(user.resetOtp.code, otp)) {
    user.resetOtp.attempts = (user.resetOtp.attempts || 0) + 1;
    await user.save();
    return invalid();
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.resetOtp = { code: '', expiresAt: null, attempts: 0 };
  // A password reset revokes every existing session.
  user.refreshTokens = [];
  await user.save();
  clearSessionCookies(res);

  return sendSuccess(res, null, 'Password reset successful');
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies[COOKIE_NAMES.refresh];

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await User.findById(payload.sub);
      if (user) {
        const digest = hashRefreshToken(refreshToken);
        user.refreshTokens = (user.refreshTokens || []).filter((entry) => entry !== digest);
        await user.save();
      }
    } catch (error) {
      // ignore invalid refresh token on logout
    }
  }

  clearSessionCookies(res);
  return sendSuccess(res, null, 'Logged out');
});

export default router;
