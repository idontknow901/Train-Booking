
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { pnr } = req.query;

    if (!pnr) {
        return res.status(400).json({ success: false, message: 'PNR is required' });
    }

    const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
    const API_KEY = process.env.VITE_FIREBASE_API_KEY;

    if (!PROJECT_ID || !API_KEY) {
        return res.status(500).json({
            success: false,
            message: 'Server configuration error: Firebase keys missing'
        });
    }

    try {
        // Fetch from Firestore REST API
        const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/bookings/${pnr}?key=${API_KEY}`;
        const response = await fetch(url);

        if (response.status === 404) {
            return res.status(200).json({ valid: false, message: 'PNR not found' });
        }

        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json({ success: false, message: error.error?.message || 'Firestore API error' });
        }

        const data = await response.json();

        // Extract fields from Firestore format
        const fields = data.fields;
        const result = {
            valid: true,
            pnr: fields.pnr.stringValue,
            username: fields.username.stringValue,
            trainName: fields.trainName.stringValue,
            trainNumber: fields.trainNumber.stringValue,
            seatNumber: fields.seatNumber.integerValue || fields.seatNumber.stringValue,
            origin: fields.origin.stringValue,
            destination: fields.destination.stringValue,
        };

        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};
