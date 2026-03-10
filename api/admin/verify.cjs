const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { password } = req.body || {};

    if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
    }

    const ADMIN_HASH = (process.env.ADMIN_PASSWORD_HASH || '').trim();

    if (!ADMIN_HASH) {
        return res.status(500).json({
            success: false,
            message: 'Server error: Admin password not configured'
        });
    }

    try {
        const isMatch = await bcrypt.compare(password, ADMIN_HASH);
        if (isMatch) {
            return res.status(200).json({ success: true, message: 'Authenticated' });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};
