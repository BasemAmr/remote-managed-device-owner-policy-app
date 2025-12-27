const pool = require('../config/database');
const jwt = require('jsonwebtoken');

// Register new device
const registerDevice = async (req, res) => {
    try {
        const { device_name, android_id } = req.body;

        if (!device_name || !android_id) {
            return res.status(400).json({ error: 'device_name and android_id required' });
        }

        // Check if device already exists
        const existingDevice = await pool.query(
            'SELECT * FROM devices WHERE android_id = $1',
            [android_id]
        );

        if (existingDevice.rows.length > 0) {
            // Return existing device token
            const device = existingDevice.rows[0];
            return res.json({
                success: true,
                data: {
                    device_id: device.id,
                    device_token: device.device_token,
                    policy_version: device.policy_version
                }
            });
        }

        // Generate device token
        const device_token = jwt.sign(
            { android_id },
            process.env.DEVICE_TOKEN_SECRET,
            { expiresIn: '365d' }
        );

        // Create new device
        const result = await pool.query(
            `INSERT INTO devices (device_name, android_id, device_token) 
       VALUES ($1, $2, $3) 
       RETURNING id, device_name, device_token, policy_version`,
            [device_name, android_id, device_token]
        );

        const device = result.rows[0];

        // Create default settings
        await pool.query(
            'INSERT INTO device_settings (device_id) VALUES ($1)',
            [device.id]
        );

        // Add device_id to token
        const fullToken = jwt.sign(
            { deviceId: device.id, android_id },
            process.env.DEVICE_TOKEN_SECRET,
            { expiresIn: '365d' }
        );

        res.status(201).json({
            success: true,
            data: {
                device_id: device.id,
                device_token: fullToken,
                policy_version: device.policy_version
            }
        });

    } catch (error) {
        console.error('Register device error:', error);
        res.status(500).json({ error: 'Failed to register device' });
    }
};

// Get current policies
const getPolicies = async (req, res) => {
    try {
        const deviceId = req.deviceId;

        // Get device info
        const deviceResult = await pool.query(
            'SELECT policy_version, is_restricted FROM devices WHERE id = $1',
            [deviceId]
        );

        if (deviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const device = deviceResult.rows[0];

        // Get all policies
        const [apps, accessibility, urls, settings] = await Promise.all([
            pool.query('SELECT * FROM app_policies WHERE device_id = $1', [deviceId]),
            pool.query('SELECT * FROM accessibility_policies WHERE device_id = $1', [deviceId]),
            pool.query('SELECT * FROM url_blacklist WHERE device_id = $1', [deviceId]),
            pool.query('SELECT * FROM device_settings WHERE device_id = $1', [deviceId])
        ]);

        // Update last seen
        await pool.query(
            'UPDATE devices SET last_seen = NOW() WHERE id = $1',
            [deviceId]
        );

        res.json(
            apps.rows.map(app => ({
                package_name: app.package_name,
                is_blocked: app.is_blocked,
                is_uninstallable: app.is_uninstallable
            }))
        );

    } catch (error) {
        console.error('Get policies error:', error);
        res.status(500).json({ error: 'Failed to fetch policies' });
    }
};

// Report violation
const reportViolation = async (req, res) => {
    try {
        const deviceId = req.deviceId;
        const { violation_type, details } = req.body;

        await pool.query(
            'INSERT INTO violation_logs (device_id, violation_type, details) VALUES ($1, $2, $3)',
            [deviceId, violation_type, JSON.stringify(details)]
        );

        res.json({ message: 'Violation logged' });

    } catch (error) {
        console.error('Report violation error:', error);
        res.status(500).json({ error: 'Failed to log violation' });
    }
};

// Submit approval request
const submitRequest = async (req, res) => {
    try {
        const deviceId = req.deviceId;
        const { request_type, target_data, notes } = req.body;

        // Get device settings for cooldown
        const settingsResult = await pool.query(
            'SELECT cooldown_hours FROM device_settings WHERE device_id = $1',
            [deviceId]
        );

        const cooldownHours = settingsResult.rows[0]?.cooldown_hours || 48;
        const cooldownUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);

        const result = await pool.query(
            `INSERT INTO approval_requests 
       (device_id, request_type, target_data, cooldown_until, notes) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
            [deviceId, request_type, JSON.stringify(target_data), cooldownUntil, notes]
        );

        res.status(201).json({
            request: result.rows[0],
            message: 'Request submitted. Cooldown period started.'
        });

    } catch (error) {
        console.error('Submit request error:', error);
        res.status(500).json({ error: 'Failed to submit request' });
    }
};

// Check approval status
const checkApprovalStatus = async (req, res) => {
    try {
        const deviceId = req.deviceId;
        const { request_id } = req.params;

        const result = await pool.query(
            `SELECT * FROM approval_requests 
       WHERE id = $1 AND device_id = $2`,
            [request_id, deviceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const request = result.rows[0];
        const now = new Date();
        const cooldownPassed = request.cooldown_until && new Date(request.cooldown_until) <= now;

        res.json({
            request,
            can_apply: request.status === 'approved' && cooldownPassed
        });

    } catch (error) {
        console.error('Check approval error:', error);
        res.status(500).json({ error: 'Failed to check approval status' });
    }
};

// Get URL Blacklist
const getUrls = async (req, res) => {
    try {
        const deviceId = req.deviceId;
        const result = await pool.query(
            'SELECT * FROM url_blacklist WHERE device_id = $1',
            [deviceId]
        );
        
        // Map to match Android DTO if necessary, or send raw
        res.json(result.rows);
    } catch (error) {
        console.error('Get URLs error:', error);
        res.status(500).json({ error: 'Failed to fetch URLs' });
    }
};

// Heartbeat
const heartbeat = async (req, res) => {
    try {
        const deviceId = req.deviceId;
        // Update last_seen timestamp
        await pool.query(
            'UPDATE devices SET last_seen = NOW() WHERE id = $1',
            [deviceId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Heartbeat failed' });
    }
};

// Apply Policy
const applyPolicy = async (req, res) => {
    try {
        const deviceId = req.deviceId;
        const policy = req.body;
        // Placeholder: Log the policy application (device-side action)
        console.log('Policy applied by device:', deviceId, policy);
        res.json({ success: true });
    } catch (error) {
        console.error('Apply policy error:', error);
        res.status(500).json({ error: 'Failed to apply policy' });
    }
};

// Log Violations Batch
const logViolationsBatch = async (req, res) => {
    try {
        const deviceId = req.deviceId;
        const violations = req.body;

        if (!Array.isArray(violations)) {
            return res.status(400).json({ error: 'Violations must be an array' });
        }

        const values = violations.map(v => `(${deviceId}, '${v.violation_type}', '${JSON.stringify(v.details)}')`).join(', ');
        await pool.query(
            `INSERT INTO violation_logs (device_id, violation_type, details) VALUES ${values}`,
            []
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Log violations batch error:', error);
        res.status(500).json({ error: 'Failed to log violations batch' });
    }
};

// Get Access Requests
const getAccessRequests = async (req, res) => {
    try {
        const deviceId = req.deviceId;
        const result = await pool.query(
            'SELECT * FROM approval_requests WHERE device_id = $1 ORDER BY created_at DESC',
            [deviceId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get access requests error:', error);
        res.status(500).json({ error: 'Failed to fetch access requests' });
    }
};

module.exports = {
    registerDevice,
    getPolicies,
    reportViolation,
    submitRequest,
    checkApprovalStatus,
    getUrls,
    heartbeat,
    applyPolicy,
    logViolationsBatch,
    getAccessRequests
};
