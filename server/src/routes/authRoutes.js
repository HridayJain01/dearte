import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/index.js';
import {
  COOKIE_NAMES,
  accessCookieOptions,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  userDto,
  verifyAccessToken,
  verifyRefreshToken,
} from '../utils/auth.js';
import { sendError, sendSuccess } from '../utils/responses.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

function setSessionCookies(res, accessToken, refreshToken) {
  res.cookie(COOKIE_NAMES.access, accessToken, accessCookieOptions());
  res.cookie(COOKIE_NAMES.refresh, refreshToken, refreshCookieOptions());
}

function clearSessionCookies(res) {
  res.clearCookie(COOKIE_NAMES.access, accessCookieOptions());
  res.clearCookie(COOKIE_NAMES.refresh, refreshCookieOptions());
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });

  if (!user) {
    return sendError(res, 'Invalid credentials', 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return sendError(res, 'Invalid credentials', 401);
  }

  if (user.status !== 'Active') {
    return sendError(res, 'Your account is awaiting admin activation', 403);
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-10);
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

    if (!user || !(user.refreshTokens || []).includes(refreshToken)) {
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

    if (!user || !(user.refreshTokens || []).includes(refreshToken)) {
      clearSessionCookies(res);
      return sendError(res, 'Invalid session', 401);
    }

    const nextRefreshToken = signRefreshToken(user);
    const nextAccessToken = signAccessToken(user);
    user.refreshTokens = (user.refreshTokens || [])
      .filter((token) => token !== refreshToken)
      .concat(nextRefreshToken)
      .slice(-10);
    await user.save();

    setSessionCookies(res, nextAccessToken, nextRefreshToken);
    return sendSuccess(res, { user: userDto(user) }, 'Session refreshed');
  } catch (error) {
    clearSessionCookies(res);
    return sendError(res, 'Invalid session', 401);
  }
});

router.post('/register', async (req, res) => {
  const existing = await User.findOne({ email: String(req.body.email || '').toLowerCase().trim() });
  if (existing) {
    return sendError(res, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({
    name: req.body.customerName,
    email: String(req.body.email).toLowerCase().trim(),
    mobile: req.body.mobile,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    country: req.body.country,
    pinCode: req.body.pinCode,
    companyName: req.body.companyName,
    gstNumber: req.body.gstNumber || '',
    passwordHash,
    role: 'buyer',
    status: 'Inactive',
    registeredAt: new Date(),
    kycDocuments: ['GST Certificate'],
  });

  return sendSuccess(res, { user: userDto(user) }, 'Registration submitted. Your account will be activated by the admin team.');
});

router.post('/forgot-password', async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase().trim() });
  if (!user) {
    return sendSuccess(res, { otpSent: true }, 'If the account exists, reset instructions have been sent.');
  }

  const otp = '123456';
  user.resetOtp = {
    code: otp,
    expiresAt: new Date(Date.now() + 1000 * 60 * 10),
  };
  await user.save();

  return sendSuccess(res, { otpSent: true, otp }, 'OTP sent successfully');
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() });
  if (!user) {
    return sendError(res, 'Account not found', 404);
  }

  if (!user.resetOtp?.code || user.resetOtp.code !== otp || !user.resetOtp.expiresAt || user.resetOtp.expiresAt < new Date()) {
    return sendError(res, 'Invalid OTP');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetOtp = { code: '', expiresAt: null };
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
        user.refreshTokens = (user.refreshTokens || []).filter((token) => token !== refreshToken);
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
