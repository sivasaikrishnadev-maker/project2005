const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Helper: sign a JWT for a user ───────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── Helper: send token + user data as JSON ──────────────────────────────────
const sendAuthResponse = (res, statusCode, user, token) => {
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:    user._id,
      name:  user.name,
      email: user.email,
    },
  });
};

// ─── POST /api/auth/signup ───────────────────────────────────────────────────
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      const err = new Error('Name, email, and password are required');
      err.statusCode = 400;
      return next(err);
    }

    // Reject if email already registered
    const existing = await User.findOne({ email });
    if (existing) {
      const err = new Error('Email is already registered');
      err.statusCode = 409;
      return next(err);
    }

    // Hash password with bcrypt (salt rounds = 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, password: hashedPassword });
    const token = signToken(user._id);

    sendAuthResponse(res, 201, user, token);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.statusCode = 400;
      return next(err);
    }

    // Explicitly select password since it has select:false on the schema
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    // bcrypt.compare handles timing-safe comparison
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      return next(err);
    }

    const token = signToken(user._id);
    sendAuthResponse(res, 200, user, token);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
// Returns the currently authenticated user (requires protect middleware)
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      return next(err);
    }
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, getMe };
