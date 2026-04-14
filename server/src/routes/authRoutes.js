import express from 'express';
import bcrypt from 'bcryptjs';
import { db, saveDb } from '../services/store.js';
import { sendError, sendSuccess } from '../utils/responses.js';
import { signToken } from '../utils/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find((entry) => entry.email === email);

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

  const token = signToken(user);
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });

  return sendSuccess(
    res,
    {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
      },
    },
    'Login successful',
  );
});

router.post('/register', async (req, res) => {
  const existing = db.users.find((entry) => entry.email === req.body.email);

  if (existing) {
    return sendError(res, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = {
    id: `user-${db.users.length + 1}`,
    name: req.body.customerName,
    email: req.body.email,
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
    registeredAt: new Date().toISOString(),
    kycDocuments: ['GST Certificate'],
  };

  db.users.push(user);
  saveDb();

  return sendSuccess(
    res,
    { user },
    'Registration submitted. Your account will be activated by the admin team.',
  );
});

router.post('/forgot-password', (req, res) =>
  sendSuccess(
    res,
    {
      otpSent: true,
      email: req.body.email,
      otp: '123456',
    },
    'OTP sent successfully',
  ),
);

router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = db.users.find((entry) => entry.email === email);

  if (!user) {
    return sendError(res, 'Account not found', 404);
  }

  if (otp !== '123456') {
    return sendError(res, 'Invalid OTP');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  saveDb();
  return sendSuccess(res, null, 'Password reset successful');
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return sendSuccess(res, null, 'Logged out');
});

export default router;
