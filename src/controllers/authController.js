const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Admin login
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if admin exists
        const result = await pool.query(
            'SELECT * FROM admin_users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            admin: {
                id: admin.id,
                email: admin.email
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// Create admin user (for initial setup)
const createAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if admin already exists
        const existingAdmin = await pool.query(
            'SELECT * FROM admin_users WHERE email = $1',
            [email]
        );

        if (existingAdmin.rows.length > 0) {
            return res.status(409).json({ error: 'Admin user already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create admin user
        const result = await pool.query(
            'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
            [email, password_hash]
        );

        res.status(201).json({
            message: 'Admin user created successfully',
            admin: result.rows[0]
        });

    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Failed to create admin user' });
    }
};

// Verify token (for frontend to check if token is still valid)
const verifyToken = async (req, res) => {
    try {
        // If we reach here, the authenticateAdmin middleware has already verified the token
        const adminId = req.adminId;

        const result = await pool.query(
            'SELECT id, email, created_at FROM admin_users WHERE id = $1',
            [adminId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        res.json({
            valid: true,
            admin: result.rows[0]
        });

    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
};

module.exports = {
    adminLogin,
    createAdmin,
    verifyToken
};
