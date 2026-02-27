const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, phone, password, email, location } = req.body;

        if (!name || !phone || !password) {
            return res.status(400).json({ error: 'Name, phone, and password are required' });
        }

        const existing = await User.findOne({ phone });
        if (existing) {
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        const user = await User.create({
            name,
            phone,
            passwordHash: password, // Will be hashed by pre-save hook
            email: email || '',
            location: location || {},
        });

        const token = signToken(user._id);
        res.status(201).json({ token, user });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone and password are required' });
        }

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(401).json({ error: 'Invalid phone or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid phone or password' });
        }

        const token = signToken(user._id);
        res.json({ token, user });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
    res.json({ user: req.user });
};
