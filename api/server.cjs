const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

const app = express();
app.use(cors());
app.use(express.json());

const cleanHash = (str) => {
    const trimmed = str.replace(/^['"]|['"]$/g, '').trim();
    if (trimmed.startsWith('$')) return trimmed;
    try {
        return Buffer.from(trimmed, 'base64').toString();
    } catch (e) {
        return trimmed;
    }
};
const ADMIN_HASH = cleanHash((process.env.ADMIN_PASSWORD_HASH || '').trim());
console.log('🔐 ADMIN_HASH set?', !!ADMIN_HASH && ADMIN_HASH.length > 10);

// Serve static files from the dist directory (if built)
app.use(express.static(path.join(__dirname, '../dist')));

// Simple health check endpoint for debugging
app.get('/api/ping', (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

app.post('/api/admin/verify', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required' });
    }

    if (!ADMIN_HASH) {
        console.error('SERVER ERROR: ADMIN_PASSWORD_HASH is not set');
        return res.status(500).json({
            success: false,
            message: 'Server configuration error: Admin hash not found in environment'
        });
    }

    try {
        const isMatch = await bcrypt.compare(password, ADMIN_HASH.trim());
        if (isMatch) {
            res.json({ success: true, message: 'Authenticated' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid password' });
        }
    } catch (error) {
        console.error('BCRYPT ERROR:', error);
        res.status(500).json({
            success: false,
            message: `Server comparison error: ${error.message || 'Unknown error'}`
        });
    }
});

// Catch-all route for SPA fallback (serves index.html for unknown routes)
app.get('/*', (req, res) => {
    // If it's an API route or file that doesn't exist, ignore (or handle accordingly)
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    // Serve index.html from dist for SPA routing
    const indexPath = path.join(__dirname, '../dist/index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            // If dist doesn't exist (dev mode), just send a helpful message
            res.status(404).send('Not Found');
        }
    });
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = 3001;
    app.listen(PORT, () => {
        console.log(`API server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
