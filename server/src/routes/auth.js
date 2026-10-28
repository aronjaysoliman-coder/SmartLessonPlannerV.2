const crypto = require('node:crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Session = require('../models/Session');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SESSION_DAYS = 30;

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait and try again.' },
});

function publicUser(user) {
  return {
    uid: user.uid,
    fullName: user.fullName,
    email: user.email,
    photoUrl: user.photoUrl || '',
    role: user.role,
  };
}

async function createSession(user, res, status = 200) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await Session.create({ userId: user._id, tokenHash, expiresAt });
  res.status(status).json({ token, user: publicUser(user), expiresAt });
}

router.post('/register', registrationLimiter, async (req, res) => {
  const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!fullName || fullName.length > 120) {
    return res.status(400).json({ error: 'Enter a name between 1 and 120 characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  }

  try {
    if (await User.exists({ email })) {
      return res.status(409).json({ error: 'An account with this email already exists. Try logging in.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ uid: crypto.randomUUID(), fullName, email, passwordHash, role: 'user' });
    await createSession(user, res, 201);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists. Try logging in.' });
    }
    console.error('[auth] registration failed:', err.message);
    res.status(500).json({ error: 'Could not create your account. Please try again.' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });

  try {
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    await createSession(user, res);
  } catch (err) {
    console.error('[auth] login failed:', err.message);
    res.status(500).json({ error: 'Could not log in right now. Please try again.' });
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.auth) }));

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await Session.deleteOne({ _id: req.sessionId });
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] logout failed:', err.message);
    res.status(500).json({ error: 'Could not end your session. Please try again.' });
  }
});

module.exports = router;