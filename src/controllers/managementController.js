const pool = require('../config/database');

// Get all devices
const getDevices = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, device_name, android_id, last_seen, policy_version, is_restricted, created_at 
       FROM devices ORDER BY created_at DESC`
        );

        res.json({ devices: result.rows });
    } catch (error) {
        console.error('Get devices error:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
};

// Get installed apps for a device
const getInstalledApps = async (req, res) => {
    try {
        const { device_id } = req.params;

        // Validate device_id format (UUID)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(device_id)) {
            return res.status(400).json({ error: 'Invalid device_id format' });
        }

        const result = await pool.query(
            `SELECT ia.package_name, ia.app_name, ia.version_code, ia.version_name, ia.created_at, ia.updated_at,
                    ap.is_blocked, ap.is_uninstallable
             FROM installed_apps ia
             LEFT JOIN app_policies ap ON ia.device_id = ap.device_id AND ia.package_name = ap.package_name
             WHERE ia.device_id = $1
             ORDER BY ia.app_name`,
            [device_id]
        );

        res.json({ apps: result.rows });
    } catch (error) {
        console.error('Get apps error:', error);
        res.status(500).json({ error: 'Failed to fetch apps' });
    }
};

// Add/Update app policy
const setAppPolicy = async (req, res) => {
    try {
        const { device_id, package_name, app_name, is_blocked, is_uninstallable } = req.body;

        const result = await pool.query(
            `INSERT INTO app_policies (device_id, package_name, app_name, is_blocked, is_uninstallable)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (device_id, package_name) 
       DO UPDATE SET 
         is_blocked = EXCLUDED.is_blocked,
         is_uninstallable = EXCLUDED.is_uninstallable,
         updated_at = NOW()
       RETURNING *`,
            [device_id, package_name, app_name, is_blocked, is_uninstallable]
        );

        res.json({
            message: 'App policy updated',
            policy: result.rows[0]
        });
    } catch (error) {
        console.error('Set app policy error:', error);
        res.status(500).json({ error: 'Failed to update app policy' });
    }
};

// Add URL to blacklist
const addBlockedUrl = async (req, res) => {
    try {
        const { device_id, url_pattern, description } = req.body;

        const result = await pool.query(
            'INSERT INTO url_blacklist (device_id, url_pattern, description) VALUES ($1, $2, $3) RETURNING *',
            [device_id, url_pattern, description]
        );

        res.status(201).json({
            message: 'URL added to blacklist',
            url: result.rows[0]
        });
    } catch (error) {
        console.error('Add URL error:', error);
        res.status(500).json({ error: 'Failed to add URL' });
    }
};

// Remove URL from blacklist
const removeBlockedUrl = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('DELETE FROM url_blacklist WHERE id = $1', [id]);

        res.json({ message: 'URL removed from blacklist' });
    } catch (error) {
        console.error('Remove URL error:', error);
        res.status(500).json({ error: 'Failed to remove URL' });
    }
};

// Get pending approval requests
const getPendingRequests = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ar.*, d.device_name 
       FROM approval_requests ar
       JOIN devices d ON ar.device_id = d.id
       WHERE ar.status = 'pending'
       ORDER BY ar.requested_at DESC`
        );

        res.json({ requests: result.rows });
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
};

// Approve/deny request
const resolveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body; // 'approved' or 'denied'

        if (!['approved', 'denied'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await pool.query(
            `UPDATE approval_requests 
       SET status = $1, resolved_at = NOW(), notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING *`,
            [status, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json({
            message: `Request ${status}`,
            request: result.rows[0]
        });
    } catch (error) {
        console.error('Resolve request error:', error);
        res.status(500).json({ error: 'Failed to resolve request' });
    }
};

// Get violations
const getViolations = async (req, res) => {
    try {
        const { device_id } = req.query;

        let query = `
      SELECT vl.*, d.device_name 
      FROM violation_logs vl
      JOIN devices d ON vl.device_id = d.id
    `;
        const params = [];

        if (device_id) {
            query += ' WHERE vl.device_id = $1';
            params.push(device_id);
        }

        query += ' ORDER BY vl.created_at DESC LIMIT 100';

        const result = await pool.query(query, params);

        res.json({ violations: result.rows });
    } catch (error) {
        console.error('Get violations error:', error);
        res.status(500).json({ error: 'Failed to fetch violations' });
    }
};

// Update device settings
const updateSettings = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { cooldown_hours, require_admin_approval, vpn_always_on, prevent_factory_reset } = req.body;

        // Validate device_id format (UUID)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(device_id)) {
            return res.status(400).json({ error: 'Invalid device_id format' });
        }

        const result = await pool.query(
            `UPDATE device_settings 
       SET cooldown_hours = COALESCE($1, cooldown_hours),
           require_admin_approval = COALESCE($2, require_admin_approval),
           vpn_always_on = COALESCE($3, vpn_always_on),
           prevent_factory_reset = COALESCE($4, prevent_factory_reset),
           updated_at = NOW()
       WHERE device_id = $5
       RETURNING *`,
            [cooldown_hours, require_admin_approval, vpn_always_on, prevent_factory_reset, device_id]
        );

        res.json({
            message: 'Settings updated',
            settings: result.rows[0]
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

module.exports = {
    getDevices,
    getInstalledApps,
    setAppPolicy,
    addBlockedUrl,
    removeBlockedUrl,
    getPendingRequests,
    resolveRequest,
    getViolations,
    updateSettings
};
