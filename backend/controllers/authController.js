// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Login user (Employee or Admin)
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const [users] = await pool.query(
      'SELECT id, name, email, password_hash, role, department FROM users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_expense_rpa_2026_secure_key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    };

    const token = jwt.sign(payload, secret, { expiresIn });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login authentication.',
      error: error.message
    });
  }
}

/**
 * Register a new employee or admin
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password, role = 'employee', department } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and department are required fields.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address is already registered.'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const validatedRole = role === 'admin' ? 'admin' : 'employee';

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash, validatedRole, department.trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      userId: result.insertId
    });
  } catch (error) {
    console.error('[Auth Register Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during user registration.',
      error: error.message
    });
  }
}

/**
 * Fetch current authenticated user's profile
 * GET /api/auth/me
 */
async function getProfile(req, res) {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, department, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('[Auth Profile Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving user profile.',
      error: error.message
    });
  }
}

module.exports = {
  login,
  register,
  getProfile
};
