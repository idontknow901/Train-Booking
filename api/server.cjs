const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH;

// Serve static files from the dist directory (if built)
app.use(express.static(path.join(__dirname, '../dist')));

app.post('/api/admin/verify', async (req, res) => {
    const { password } = req.body;

    if (!ADMIN_HASH) {
        // Fallback for demo if no hash is set in .env
        if (password === 'admin123') {
            return res.json({ success: true, message: 'Authenticated' });
        }
        return res.status(401).json({ success: false, message: 'No admin password configured' });
    }

    try {
        const isMatch = await bcrypt.compare(password, ADMIN_HASH);
        if (isMatch) {
            res.json({ success: true, message: 'Authenticated' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid password' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Catch-all route for SPA fallback (serves index.html for unknown routes)
app.get('*', (req, res) => {
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

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
});
