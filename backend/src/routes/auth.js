const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─── Helper ───────────────────────────────────────────────────────────────────
function signToken(userId) {
  return jwt.sign({userId}, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const {name, email, password} = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({error: 'name, email and password are required'});
    }

    const existing = await User.findOne({email: email.toLowerCase()});
    if (existing) {
      return res.status(409).json({error: 'Email already registered'});
    }

    const user = await User.create({name, email, password});
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: {id: user._id, name: user.name, email: user.email},
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors)
        .map(e => e.message)
        .join(', ');
      return res.status(400).json({error: msg});
    }
    console.error('[Auth] register error:', err);
    res.status(500).json({error: 'Registration failed'});
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const {email, password} = req.body;

    if (!email || !password) {
      return res.status(400).json({error: 'email and password are required'});
    }

    const user = await User.findOne({email: email.toLowerCase()}).select(
      '+password',
    );
    if (!user) {
      return res.status(401).json({error: 'Invalid email or password'});
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({error: 'Invalid email or password'});
    }

    const token = signToken(user._id);

    res.json({
      token,
      user: {id: user._id, name: user.name, email: user.email},
    });
  } catch (err) {
    console.error('[Auth] login error:', err);
    res.status(500).json({error: 'Login failed'});
  }
});

// ─── GET /api/auth/me  (protected) ───────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({error: 'User not found'});

    res.json({user: {id: user._id, name: user.name, email: user.email}});
  } catch (err) {
    console.error('[Auth] /me error:', err);
    res.status(500).json({error: 'Failed to fetch user'});
  }
});

module.exports = router;
