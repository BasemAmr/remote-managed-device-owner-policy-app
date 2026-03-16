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

        // Check accountability partner lock
        if (!admin.unlocked_until || new Date(admin.unlocked_until) < new Date()) {
            return res.status(403).json({ 
                error: 'Account locked. Your accountability partner must unlock it.',
                locked: true
            });
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
            'SELECT id, email, created_at, unlocked_until FROM admin_users WHERE id = $1',
            [adminId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        const admin = result.rows[0];
        
        // Also check if still unlocked
        if (!admin.unlocked_until || new Date(admin.unlocked_until) < new Date()) {
            return res.status(403).json({ error: 'Account has been locked. Partner must unlock it again.' });
        }

        res.json({
            valid: true,
            admin: admin
        });

    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
};

// --- Accountability Partner Features ---

const partnerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const result = await pool.query('SELECT * FROM partner_users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid partner credentials' });

        const partner = result.rows[0];
        const isValid = await bcrypt.compare(password, partner.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Invalid partner credentials' });

        const token = jwt.sign(
            { partnerId: partner.id, adminId: partner.admin_id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ message: 'Partner login successful', token, partner: { id: partner.id, email: partner.email, adminId: partner.admin_id } });
    } catch (error) {
        console.error('Partner login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

const unlockAdmin = async (req, res) => {
    try {
        const { durationHours } = req.body;
        const hours = durationHours || 1; // default to 1 hour
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.partnerId) return res.status(403).json({ error: 'Only partners can unlock' });

        const adminId = decoded.adminId;
        const result = await pool.query(
            "UPDATE admin_users SET unlocked_until = NOW() + INTERVAL '" + parseInt(hours) + " hours' WHERE id = $1 RETURNING unlocked_until",
            [adminId]
        );

        res.json({ message: `Admin unlocked for ${hours} hour(s)`, unlocked_until: result.rows[0].unlocked_until });
    } catch (error) {
        console.error('Unlock error:', error);
        res.status(500).json({ error: 'Failed to unlock admin' });
    }
};

const createPartner = async (req, res) => {
    try {
        const { email, password, adminId } = req.body;
        if (!email || !password || !adminId) return res.status(400).json({ error: 'Email, password, and adminId required' });

        const password_hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO partner_users (email, password_hash, admin_id) VALUES ($1, $2, $3) RETURNING id',
            [email, password_hash, adminId]
        );

        res.status(201).json({ message: 'Partner created', partnerId: result.rows[0].id });
    } catch (error) {
        console.error('Create partner error:', error);
        res.status(500).json({ error: 'Failed to create partner' });
    }
};

module.exports = {
    adminLogin,
    createAdmin,
    verifyToken,
    partnerLogin,
    unlockAdmin,
    createPartner
};
